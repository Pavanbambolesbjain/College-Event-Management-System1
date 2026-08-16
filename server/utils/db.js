const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

/**
 * Helper to resolve the correct path to the JSON database files.
 */
function getFilePath(file) {
  return path.join(DATA_DIR, file.endsWith('.json') ? file : `${file}.json`);
}

/**
 * Reads data from a JSON file.
 * Returns empty array if file does not exist.
 */
async function readData(file) {
  const filePath = getFilePath(file);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, create it with empty array
      await writeData(file, []);
      return [];
    }
    throw error;
  }
}

/**
 * Writes data to a JSON file.
 */
async function writeData(file, data) {
  const filePath = getFilePath(file);
  try {
    const dataString = JSON.stringify(data, null, 2);
    // Write to a temporary file first then rename to ensure atomicity and prevent corruption
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, dataString, 'utf8');
    await fs.rename(tempPath, filePath);
    return true;
  } catch (error) {
    console.error(`Error writing to ${file}:`, error);
    throw error;
  }
}

/**
 * Finds a record by its unique ID.
 */
async function findById(file, idKey, idValue) {
  const data = await readData(file);
  return data.find(item => item[idKey] === idValue) || null;
}

/**
 * Finds a record by its email.
 */
async function findByEmail(file, email) {
  const data = await readData(file);
  return data.find(item => item.email && item.email.toLowerCase() === email.toLowerCase()) || null;
}

/**
 * Appends a new record to a file.
 */
async function createRecord(file, record) {
  const data = await readData(file);
  data.push(record);
  await writeData(file, data);
  return record;
}

/**
 * Updates a record in a file.
 */
async function updateRecord(file, idKey, idValue, updatedData) {
  const data = await readData(file);
  const index = data.findIndex(item => item[idKey] === idValue);
  if (index === -1) return null;

  // Merge existing fields with updated ones, preserving the ID key
  data[index] = { ...data[index], ...updatedData, [idKey]: idValue };
  await writeData(file, data);
  return data[index];
}

/**
 * Deletes a record from a file.
 */
async function deleteRecord(file, idKey, idValue) {
  const data = await readData(file);
  const index = data.findIndex(item => item[idKey] === idValue);
  if (index === -1) return false;

  data.splice(index, 1);
  await writeData(file, data);
  return true;
}

module.exports = {
  readData,
  writeData,
  findById,
  findByEmail,
  createRecord,
  updateRecord,
  deleteRecord
};
