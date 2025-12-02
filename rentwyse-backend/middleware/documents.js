const multer = require("multer"); // we are using this package multer to handle the files that will ne comming with the first post request and agreement

const DOC_MIME_TYPE_MAP = {
  "application/pdf": "pdf",
  "application/msword": "doc", // For .doc files
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx", // For .docx files
};

// Storage configuration for documents

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const isValid = DOC_MIME_TYPE_MAP[file.mimetype];
      let error = new Error("Invalid document type");
      if (isValid) {
        error = null;
      }
      cb(error, "documents"); // Save to 'documents' folder
    },
    filename: (req, file, cb) => {
      const name = file.originalname.toLowerCase();
      const ext = DOC_MIME_TYPE_MAP[file.mimetype];
      cb(null, name + "-" + Date.now() + "." + ext); // Save only the file name with an extension
    },
  });

module.exports = multer({ storage: storage }).array("documents");
