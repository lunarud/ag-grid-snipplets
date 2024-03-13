function parseJsonPath(json, path) {
  // Split the path into individual components
  const components = path.split('.');

  // Initialize the result with the original JSON object
  let result = json;

  // Traverse through each component of the path
  for (let component of components) {
    // Check if the component is a wildcard
     if (component === '[*]' || component.includes('[*]')) {
      // If it's a wildcard, flatten the result array
        const [key, index] = component.split('[');
       result = result[key];
       const result2 = result.reduce((acc, val) => {
           console.log("val:" + JSON.stringify(val));
           let val1 = val["title"]; 
        return acc.concat(val1);
      }, []);
      
      console.log(result2);
      
      //result = result.reduce((acc, val) => acc.concat(val), []);
      
      
    } else if (component.includes('[') && component.includes(']')) {
      // Check if the component is an array index
      const [key, index] = component.split('[');
      const arrayIndex = parseInt(index.slice(0, -1));
      result = result[key][arrayIndex];
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
