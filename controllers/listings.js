const Listing = require("../models/listing");
const cloudinary = require("../cloudConfig");
const fs = require("fs");
const axios = require("axios");

module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs")
};

module.exports.showListing = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id).populate({ path: "reviews", populate: { path: "author" }, }).populate("owner");
  if (!listing) {
    req.flash("error", "Listing you requested for doesn't exist!");
    return res.redirect("/listings");
  }
  console.log(listing);
  res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res, next) => {
  try {
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;

    const query = newListing.location;
    const geoResponse = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
    );

    if (!geoResponse.data || geoResponse.data.length === 0) {
      req.flash("error", "Invalid location. Try again.");
      return res.redirect("/listings/new");
    }

    const coords = geoResponse.data[0];

    newListing.geometry = {
      type: "Point",
      coordinates: [parseFloat(coords.lon), parseFloat(coords.lat)]
    };

    if (req.file) {
      // Upload image to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "wanderlust_DEV"
      });

      newListing.image = {
        url: result.secure_url,    // Public URL to display
        filename: result.public_id // Save for deletion later
      };

      // Delete local file after upload
      fs.unlinkSync(req.file.path);
    }

    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
  } catch (err) {
    next(err);
  }
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested for doesn't exist!");
    return res.redirect("/listings");
  }

  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");

  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
  try {
    let { id } = req.params;

    const oldListing = await Listing.findById(id);

    // If location changed → re-geocode
    if (req.body.listing.location !== oldListing.location) {
      const geoResponse = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${req.body.listing.location}`,
        { headers: { "User-Agent": "StaySphere App" } }
      );

      if (geoResponse.data.length > 0) {
        oldListing.geometry = {
          type: "Point",
          coordinates: [
            parseFloat(geoResponse.data[0].lon),
            parseFloat(geoResponse.data[0].lat)
          ]
        };
      }
    }

    // Update other fields
    Object.assign(oldListing, req.body.listing);

    // Image update
    if (req.file) {
      if (oldListing.image?.filename) {
        await cloudinary.uploader.destroy(oldListing.image.filename);
      }

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "StaySphere_DEV"
      });

      oldListing.image = {
        url: result.secure_url,
        filename: result.public_id
      };

      fs.unlinkSync(req.file.path);
    }

    await oldListing.save();

    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
  } catch (err) {
    next(err);
  }

};

module.exports.destroyListing = async (req, res) => {
  try {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);

    if (deletedListing && deletedListing.image && deletedListing.image.filename) {
      await cloudinary.uploader.destroy(deletedListing.image.filename);
    }

    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
  } catch (err) {
    next(err);
  }
};