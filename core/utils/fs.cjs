const fs = require('fs-extra');
const path = require('path');

class FSHelpers {
  static async ensureDir(dirPath) {
    try {
      await fs.ensureDir(dirPath);
      return true;
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
    }
  }

  static async copyFileSafe(source, destination) {
    try {
      const dir = path.dirname(destination);
      await this.ensureDir(dir);
      if (await fs.pathExists(source)) {
        await fs.copy(source, destination);
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(`Failed to copy ${source} to ${destination}: ${error.message}`);
    }
  }

  static async writeIfMissing(filePath, content) {
    try {
      if (!(await fs.pathExists(filePath))) {
        await this.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, content, 'utf8');
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(`Failed to write ${filePath}: ${error.message}`);
    }
  }

  static async readJSONSafe(filePath, defaultValue = null) {
    try {
      if (await fs.pathExists(filePath)) {
        return await fs.readJson(filePath);
      }
      return defaultValue;
    } catch (error) {
      throw new Error(`Failed to read JSON ${filePath}: ${error.message}`);
    }
  }

  static async exists(p) {
    return await fs.pathExists(p);
  }

  static async moveSafe(source, destination, options = {}) {
    try {
      await this.ensureDir(path.dirname(destination));
      await fs.move(source, destination, options);
      return true;
    } catch (error) {
      throw new Error(`Failed to move ${source} to ${destination}: ${error.message}`);
    }
  }

  static async removeSafe(p) {
    try {
      if (await this.exists(p)) {
        await fs.remove(p);
      }
      return true;
    } catch (error) {
      throw new Error(`Failed to remove ${p}: ${error.message}`);
    }
  }

  static async readdir(dir) {
    return await fs.readdir(dir);
  }

  static async stat(p) {
    return await fs.stat(p);
  }

  static readJsonSync(p) {
    return fs.readJsonSync(p);
  }
}

module.exports = FSHelpers;

