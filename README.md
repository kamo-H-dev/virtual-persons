# Virtual Persons: Please note that this service is not functional as-is; it serves solely as an example of my code.

This repository contains a service that generates virtual persons and saves them to a database.
## Description
The service is organized in the following way:

- `VirtualPersons.js` contains the main class `VirtualPersons` which is responsible for generating virtual persons.
- `VirtualPersonsService.js` does not share any code which is responsible for interacting with the database.
- `json-formats.js` contains the JSON schema definitions for AI responses.
The service is implemented in JavaScript and uses the following dependencies:
- `imageCard.vue`: A Vue component for rendering image cards with AI service selection and some other selections.