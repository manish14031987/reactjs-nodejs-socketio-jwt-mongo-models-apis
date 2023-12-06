const sharp = require("sharp");
const path = require("path");

class Resize {
  constructor(folder, width, height) {
    this.folder = folder;
    this.width = width;
    this.height = height;
  }
  async save(buffer, imageName) {
    const filename = imageName;
    const filepath = this.filepath(filename);
    await sharp(buffer)
      .resize(this.width, this.height, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })
      .toFile(filepath);
    return filename;
  }

  filepath(filename) {
    return path.resolve(`${this.folder}/${filename}`);
  }
}
module.exports = Resize;
