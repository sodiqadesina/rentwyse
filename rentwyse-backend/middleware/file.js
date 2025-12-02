const multer = require("multer"); // we are using this package multer to handle the files that will ne comming with the first post request and agreement

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",

};
// over here we configuring multer to identify and save the file in the /backen/image folder and throw error if the ext is not specified in the MIME_TYPE_MAP above
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isValid = MIME_TYPE_MAP[file.mimetype];
    let error = new Error("Invalid mime type");
    if (isValid) {
      error = null;
    }
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    console.log("multer is executing some files");
    const name = file.originalname.toLocaleLowerCase().split("").join("-");
    const ext = MIME_TYPE_MAP[file.mimetype];
    cb(null, name + "-" + Date.now() + "." + ext);
  },
});



module.exports = multer({ storage: storage }).array("image");
