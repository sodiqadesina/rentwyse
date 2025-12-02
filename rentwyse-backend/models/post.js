const { Double } = require("mongodb");
const mongoose = require("mongoose");

const postSchema = mongoose.Schema({
  title: { type: String, required: true },
  imagePath: [{ type: String, required: true }],
  description: { type: String, required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", require: true }, // so we are doing this to keep track of who creates each post so we can then use to authorize changes to the post
  //Over here we are adding the ref: 'User' to create a Pk - Fk relationship btw the post and user schema
  bedroom: { type: Number, required: true },
  bathroom: { type: Number, required: true },
  typeOfProperty: { type: String, required: true },
  furnished: { type: Boolean, default: false },
  parkingAvailable: { type: Boolean, default: false },
  rentType: { type: String, required: true },
  city: { type: String, required: true },
  address: { type: String, required: true },
  province: { type: String, required: true },
  zipcode: { type: String, required: true },
  country: { type: String, required: true },
  price: { type: Number, required: true },
  dateListed: { type: Date, required: true },
  dateAvailableForRent: { type: Date, required: true },
});

module.exports = mongoose.model("Post", postSchema);
