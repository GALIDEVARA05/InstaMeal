const { v4: uuidv4 } = require('uuid');

function generateCardNumber(){
  return 'MC-' + uuidv4().slice(0,8).toUpperCase();
}

module.exports = generateCardNumber;
