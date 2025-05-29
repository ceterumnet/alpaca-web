const fs = require('fs');
const { parse } = require('csv-parse');
const { encode } = require('msgpack-lite');

// Path to your input CSV and output MessagePack file
const inputCsv = 'NGC.csv';
const outputMsgpack = 'ngc.msgpack';

// Read and parse the CSV
fs.readFile(inputCsv, 'utf8', (err, csvData) => {
  if (err) {
    console.error('Error reading CSV:', err);
    process.exit(1);
  }

  parse(csvData, { columns: true, skip_empty_lines: true, delimiter: ';' }, (err, records) => {
    if (err) {
      console.error('Error parsing CSV:', err);
      process.exit(1);
    }

    const trimmed = records.map((rec) => ({ 
      Name: rec.Name, 
      Type: rec.Type, 
      RA: rec.RA, 
      Dec: rec.Dec, 
      Mag: rec.Mag, 
      VMag: rec["V-Mag"], 
      M: rec.M, 
      NGC: rec.NGC, 
      IC: rec.IC, 
      CstarNames: rec["Cstar Names"], 
      Identifiers: rec["Identifiers"], 
      CommonNames: rec["Common names"] }));

    // Encode to MessagePack
    const msgpackData = encode(trimmed);

    // Write to file
    fs.writeFile(outputMsgpack, msgpackData, err => {
      if (err) {
        console.error('Error writing MessagePack:', err);
        process.exit(1);
      }
      console.log(`Successfully wrote ${outputMsgpack} (${msgpackData.length} bytes)`);
    });
  });
});