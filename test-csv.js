// Test script for CSV conversion functionality
// This script can be used to test the CSV conversion with sample data

// Sample flashcard data for testing
const sampleFlashcards = [
  { term: "kernel", definition: "korrel" },
  { term: "coil", definition: "kronkel" },
  { term: "ventriloquist", definition: "buikspreker" },
  { term: "frail", definition: "broos, zwak" },
  { term: "to wallow in", definition: "wentelen in" },
  { term: "to be aspired to", definition: "ambiëren, plannen hebben" },
  { term: "a whim", definition: "een gril" },
  { term: "kibble", definition: "brokken" },
  { term: "to embark on", definition: "beginnen aan" }
];

// Function to convert flashcards to CSV
function testConvertToCsv(flashcards) {
  // Add header row
  let csv = 'Term,Definition\n';
  
  // Add data rows
  flashcards.forEach(card => {
    // Escape quotes and wrap fields in quotes to handle commas
    const term = `"${card.term.replace(/"/g, '""')}"`;
    const definition = `"${card.definition.replace(/"/g, '""')}"`;
    csv += `${term},${definition}\n`;
  });
  
  return csv;
}

// Test the CSV conversion
function runCsvTest() {
  const csv = testConvertToCsv(sampleFlashcards);
  console.log('CSV Output:');
  console.log(csv);
  
  // Test with special characters and commas
  const specialCaseFlashcards = [
    { term: "term with, comma", definition: "definition with, comma" },
    { term: 'term with "quotes"', definition: 'definition with "quotes"' },
    { term: "term with \nnewline", definition: "definition with \nnewline" }
  ];
  
  const specialCaseCsv = testConvertToCsv(specialCaseFlashcards);
  console.log('\nSpecial Cases CSV Output:');
  console.log(specialCaseCsv);
  
  return {
    standardCsv: csv,
    specialCaseCsv: specialCaseCsv
  };
}

// Export the test functions
if (typeof module !== 'undefined') {
  module.exports = { 
    sampleFlashcards,
    testConvertToCsv,
    runCsvTest
  };
}
