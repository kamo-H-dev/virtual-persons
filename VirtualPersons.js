const Promise = require("bluebird");
const app = require("app")
const { OpenAI } = require("openai");
const { uploadImageStorageFromUrl, createFileName } = require("utils");
const { personsListJsonFormat, personDataJsonFormat} = require("json-formats");
const { ImageService } = require("image-service");
const VirtualPersonsService = app.service('virtual-persons')

class VirtualPersons {
  constructor(project, settings) {
    this.settings = settings
    this.openAiInterface = new OpenAI(settings.openai.apiKey)
    this.projectName = VirtualPersons.getProjectName(project.websiteUrl)
    this.projectId = project._id
  }

/**
 * Initializes the process of handling virtual persons.
 *
 * This function retrieves a set of virtual persons, resolves their data,
 * saves the persons' data, and generates headshots for each person if needed.
 * It serves as a central method that orchestrates the process of dealing with
 * virtual persons in a project.
 *
 * @param {number} min - Minimum number of virtual persons to retrieve.
 * @param {number} max - Maximum number of virtual persons to retrieve.
 *
 * @returns {Promise<void>} - A promise that resolves when all processes
 * related to virtual persons are complete.
 */
  async init(min = 1, max = 3) {
    const virtualPersons = await this.getVirtualPersons(min, max)
    if (!virtualPersons) {
      return
    }

    const personsData = await this.resolvePersonsData(virtualPersons)
    const savedPersons = await this.savePersonsData(personsData)
    await this.resolvePersonImages(savedPersons)
  }

  /**
   * Retrieves a set of random virtual persons within a given range.
   *
   * @param {number} min - Minimum number of virtual persons to retrieve.
   * @param {number} max - Maximum number of virtual persons to retrieve.
   *
   * @returns {Promise<string[]>} - A promise that resolves with an array of
   * virtual persons' names.
   */
  async getVirtualPersons(min, max) {
    const randomVirtualPersons = await this.getRandomVirtualPersons(min, max)
    const filteredPersons = await this.filterExistingPersons(randomVirtualPersons)
    if (filteredPersons.length < min ) {
      console.warn('not enough persons')
    }
    return filteredPersons
  }


  /**
   * Retrieves a set of random virtual persons that do not already exist in the
   * database.
   *
   * This function first retrieves a set of random virtual persons and then
   * filters out the persons that already exist in the database.
   *
   * @param {number} min - Minimum number of virtual persons to retrieve.
   * @param {number} max - Maximum number of virtual persons to retrieve.
   *
   * @returns {Promise<string[]>} - A promise that resolves with an array of
   * virtual persons' names that do not already exist in the database.
   */
  async getRandomVirtualPersons(min, max) {
    const number = Math.floor(Math.random() * (max - min) + min)
    const prompt = `We have a project named ${this.projectName}. We need ${number} person names who are related to this project.
     The persons should be between the ages of 30-40 years old. List ${number} full names and present in JSON format.`

    const response = await this.openAiInterface.createChatCompletionJson({
      prompt,
      responseFormat: personsListJsonFormat
    })
    return response.persons.map(person => person.name)
  }


  /**
   * Filters out virtual persons that already exist in the database.
   *
   * This function takes an array of virtual person names and returns a new
   * array with the names of persons that do not already exist in the database.
   *
   * The function works by first encoding the names of the persons into their
   * Base64 equivalent using the encodeName() function. It then queries the
   * VirtualPersonsService for all persons with the same name (by comparing the
   * encoded names). The function then returns a new array with the names of
   * persons that are not in the database.
   *
   * @param {string[]} persons - A list of virtual person names.
   *
   * @returns {Promise<string[]>} - A promise that resolves with an array of
   * virtual person names that do not already exist in the database.
   */
  async filterExistingPersons(persons) {
    const encodedNames = persons.map(this.encodeName)
    const existingPersons = await VirtualPersonsService.find({
      query: {
        nameEncoded: {
          $in: encodedNames
        },
        $select: ['name', 'nameEncoded']
      },
      paginate: false
    })
    const existingPersonNames = existingPersons.map(person => person.name)
    // filter out existing persons
    return persons.filter(person => !existingPersonNames.includes(person))
  }


  /**
   * Retrieves virtual persons' data by querying the OpenAI API.
   *
   * This function takes an array of virtual person names and returns a new
   * array with the persons' data resolved. The function works by first
   * generating a prompt for the OpenAI API for each person in the list. The
   * prompt is a string that contains information about the person and asks the
   * AI to generate a biography and a status for the person.
   *
   * The function then queries the OpenAI API with each prompt and resolves the
   * persons' data from the response. The function finally returns a new array
   * with the resolved persons' data.
   *
   * @param {string[]} persons - A list of virtual person names.
   *
   * @returns {Promise<Object[]>} - A promise that resolves with an array of
   * objects, each containing a virtual person's data.
   */
  async resolvePersonsData(persons) {
    const personsData = []
    for(const person of persons) {
      if (person.biography && person.status) {
        personsData.push(person)
        continue
      }
      const prompt = this.getPersonDataPrompt(person)
      const personData = await this.openAiInterface.createChatCompletionJson({
        max_tokens: 1000,
        prompt,
        responseFormat: personDataJsonFormat
      })
      personData.push({
        name: person,
        biography: personData.biography,
        status: personData.status,
      })
    }
    return personsData
  }

  /**
   * Resolves headshots for virtual persons if they don't already exist.
   *
   * This function takes an array of virtual persons' data and resolves
   * headshots for each person in the list. The function works by first
   * checking if a headshot for the person already exists in the database.
   * If it does, the function skips the person and moves on to the next one.
   *
   * If a headshot does not exist, the function generates a headshot for the
   * person by calling the generateHeadshot() function. The function then
   * uploads the generated headshot to the database and updates the
   * person's data with the headshot URL.
   *
   * @param {Object[]} personsData - A list of virtual persons' data.
   *
   * @returns {Promise<void>} - A promise that resolves when all processes
   * related to virtual persons are complete.
   */
  async resolvePersonImages(personsData) {
    for (const personData of personsData) {
      if (personData.headshot) {
        continue
      }
      const headshot = await this.generateHeadshot(personData.name)
      if (headshot) {
        personData.headshot = headshot
      }
      await VirtualPersonsService.patch(personData._id, personData)
      // random delay between 1500 and 2500 ms
      const randomDelay = Math.floor(Math.random() * (2500 - 1500) + 1500)
      // to avoid MJ automation detection
      await Promise.delay(randomDelay)
    }
  }

  /**
   * Generates a headshot image for a virtual person.
   *
   * This function takes the name of a virtual person and returns a promise that
   * resolves with the URL of the generated headshot image. The function works by
   * querying the Midjourney API with a prompt that asks the AI to generate a
   * headshot image for the person. The function then uploads the generated image
   * to the database and returns the URL of the uploaded image.
   *
   * If the function fails to generate a headshot, it logs a warning and returns
   * undefined.
   *
   * @param {string} personName - The name of the virtual person.
   *
   * @returns {Promise<string | undefined>} - A promise that resolves with the URL
   * of the generated headshot image, or undefined if the function fails.
   */
  async generateHeadshot(personName) {
    const imagePrompt = `Photo headshot for the ${personName} , Aged 30-40 years old.`
    const options = {
      styles: [],
      aspectRatio: '1:1',
    } // aspectRatio: '16:9' styles: [], customStyle: ''
    const serviceName = 'midjourney'
    const imageService = new ImageService(this.settings, serviceName, options)
    const imageUrl = await imageService.getPicture({ query: imagePrompt, aspectRatio: options.aspectRatio })
    if (!imageUrl) {
      console.warn('Failed to generate headshot')
      return
    }
    return await uploadImageStorageFromUrl(imageUrl)
  }

/**
 * Saves the data of virtual persons to the database.
 *
 * This function takes an array of virtual persons' data and saves each person's data
 * to the database. It checks if the person data already has an `_id` attribute, which
 * indicates that the person already exists in the database. If so, it adds the person
 * to the `createdPersons` array and continues with the next person.
 *
 * If the person does not have an `_id`, it encodes the person's name using the
 * `encodeName` method and creates a new entry in the database via the
 * `VirtualPersonsService`. The function populates the new entry with the person's
 * data along with additional information such as `nameEncoded`, `link`,
 * `projectId`, `userId`, and `projectName`. The created entry is then pushed to the
 * `createdPersons` array.
 *
 * @param {Object[]} personsData - An array of objects, each containing data for a virtual person.
 *
 * @returns {Promise<Object[]>} - A promise that resolves with an array of the created persons' data.
 */
  async savePersonsData(personsData) {
    const createdPersons = []
    for (const personData of personsData) {
      if (personData._id) {
        createdPersons.push(personData)
        continue
      }
      const nameEncoded = this.encodeName(personData.name)
      const savedPerson = await VirtualPersonsService.create({ ...personData,
        nameEncoded,
        link: createFileName(personData.name),
        projectId: this.projectId,
        userId: this.settings.userId,
        projectName: this.projectName,
      })
      createdPersons.push(savedPerson)
    }
    return createdPersons
  }

/**
 * Generates a prompt for retrieving virtual person's data.
 *
 * This function takes a person's name and generates a prompt string
 * that is used to query the OpenAI API. The prompt includes the project
 * name and the person's name, and asks for two pieces of information
 * in JSON format: biography and status. This prompt is then used to
 * fetch the relevant data for the virtual person from the API.
 *
 * @param {string} person - The name of the virtual person.
 *
 * @returns {string} - A prompt string for querying the OpenAI API.
 */
  getPersonDataPrompt(person) {
    return `We have a site named ${this.projectName}. We have an author named ${person}.
     I need 2 things in JSON format: biography and status.`
  }

  /**
   * Encodes a person's name into its Base64 equivalent.
   *
   * This function takes a string as an argument, converts it to a Buffer, and
   * then calls the `toString('base64')` method on the Buffer to encode the
   * string into its Base64 equivalent. The encoded string is then returned.
   *
   * @param {string} name - The name of the person.
   *
   * @returns {string} - The Base64 encoded name.
   */
  encodeName(name) {
    return Buffer.from(name).toString('base64')
  }

  /**
   * Gets the project name from a given URL.
   *
   * This function takes a URL string as an argument, creates a new URL object
   * from it, and then returns the hostname of the URL, which is the domain name
   * of the project website. This is used to identify the project.
   *
   * @param {string} urlString - The URL string of the project website.
   *
   * @returns {string} - The domain name of the project website.
   */
  static getProjectName(urlString) {
    const url = new URL(urlString);
    return url.hostname; // This will give you the domain name
  }
}

module.exports = VirtualPersons
