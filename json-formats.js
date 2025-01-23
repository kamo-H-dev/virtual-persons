// The personsList object is a JSON schema that is used to validate
// the structure of objects returned by the OpenAI API when it is asked
// to generate a list of random virtual persons. The schema says that the
// object must be a strict JSON object with a single property named "persons"
// which is an array of objects, each of which has a single property named "name"
const personsList = {
  "type": "json_schema",
  "json_schema": {
    "name": "persons_list",
    "strict": true,
    "schema": {
      "type": "object",
      "properties": {
        "persons": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string"
              }
            },
            "required": ["name"],
            "additionalProperties": false
          }
        }
      },
      "required": ["persons"],
      "additionalProperties": false
    }
  }
}

// The personData object is a JSON schema that is used to validate
// the structure of objects returned by the OpenAI API when it is asked
// to generate a biography and a status for a virtual person. The schema
// says that the object must be a strict JSON object with two properties
// named "biography" and "status" which are strings.
const personData = {
  "type": "json_schema",
  "json_schema": {
    "name": "person_data",
    "strict": true,
    "schema": {
      "type": "object",
      "properties": {
        "biography": {
          "type": "string",
        },
        "status": {
          "type": "string",
        },
      },
      "required": ["biography", "status"],
      "additionalProperties": false
    }
  }
}


module.exports = {
  personsListJsonFormat: personsList,
  personDataJsonFormat: personData,
}
