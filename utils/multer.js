const multer = require("multer");

// store files temporarily in uploads/ folder
const upload = multer({ dest: "uploads/" });

module.exports = upload;


