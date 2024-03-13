const numbers = [1, 2, 3, 4, 5];

const sum = numbers.reduce((accumulator, currentValue) => {

  if(currentValue===4)
      currentValue = currentValue + 5;
      
  return accumulator + currentValue;
}, 0);

console.log(sum); // Output: 15 (1 + 2 + 3 + 4 + 5)
********************************

function parseJsonPath(json, path) {
  // Split the path into individual components
  const components = path.split('.');

  // Initialize the result with the original JSON object
  let result = json;
console.log("1");
  // Traverse through each component of the path
  for (let component of components) {
     console.log(component);
    // Check if the component is an array index
    if (component.includes('[') && component.includes(']')) {
      const [key, index] = component.split('[');
      const arrayIndex = parseInt(index.slice(0, -1));
      result = result[key][arrayIndex];
     console.log("2" +result);

    } else {
      result = result[component];
       console.log("3" +result);
    }

    // If the result is undefined, return null (indicating data not found)
    if (result === undefined) {
      return null;
    }
  }

  // Return the final result
  return result;
}

// Example JSON object
const jsonData = {
  "store": {
    "book": [
      { "title": "Book 1", "author": "Author 1" },
      { "title": "Book 2", "author": "Author 2" },
      { "title": "Book 3", "author": "Author 3" }
    ]
  }
};

// Example JSONPath expression
const jsonPath = 'store.book[1].title';

// Parse JSONPath and find data in JSON object
const result = parseJsonPath(jsonData, jsonPath);
console.log(result); // Output: "Book 2"

**********************************


function parseJsonPath(json, path) {

   
// Split the path by '.' and '[*]'
const parts = path.split(/\.|\[\*\]/);
console.log( parts); 
  console.log("parts:" + parts); 
 let newParts = parts.reduce((acc, val) => acc.concat(val), []);
console.log("newParts:" + newParts); 



  // Split the path into individual components
  const components = path.split('.');

  // Initialize the result with the original JSON object
  let result = json; 
  // Traverse through each component of the path
  for (let component of components) { 
    // Check if the component is a wildcard
    if (component === '[*]' || component.includes('[*]')) {
      console.log("2" + component);
      const [key, index] = component.split('[');
       result = result[key];
       console.log("key:" + key);
       console.log("index:" + index);
       console.log("key result" + JSON.stringify(result)); 

      const sum = result.reduce((acc, val) => {
           console.log("val:" + JSON.stringify(val));
           let val1 = val["title"];
            
        return acc.concat(val1);
      }, []);
        console.log("sum:" + sum);
        result = result.reduce((acc, val) => acc.concat(val), []);

 
       console.log("27" + result);
       console.log(JSON.stringify(result));
    } else if (component.includes('[') && component.includes(']')) {
      // Check if the component is an array index
      console.log("3" + component);
      const [key, index] = component.split('[');
      const arrayIndex = parseInt(index.slice(0, -1));
      result = result[key][arrayIndex];
console.log("3" + result);

    } else {
      // Otherwise, proceed as usual
      result = result[component]; 
    }

    // If the result is undefined, return null (indicating data not found)
    if (result === undefined) {
      return null;
    }
  }

  // Return the final result
  return result;
}

// Example JSON object
const jsonData = {
  "store": {
    "book": [
      { "title": "Book 1", "author": "Author 1" },
      { "title": "Book 2", "author": "Author 2" },
      { "title": "Book 3", "author": "Author 3" }
    ]
  }
};

// Example JSONPath expression with wildcard
const jsonPath = 'store.book[*].title';

// Parse JSONPath and find data in JSON object
const result = parseJsonPath(jsonData, jsonPath);
console.log(result); // Output: ["Book 1", "Book 2", "Book 3"]
***************************


const path = 'store.book[*].title';

// Split the path by '.' and '[*]'
const parts = path.split(/\.|\[\*\]/);

console.log(parts); // Output: ['store', 'book', 'title']


