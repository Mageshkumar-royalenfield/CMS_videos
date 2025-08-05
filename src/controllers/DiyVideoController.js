const {db} = require('../services/firebaseServices');
const {FieldValue } = require('firebase-admin/firestore');
const { DATA } = require('../config/data');
const AppError = require('../utils/AppError');

getVideos = async (req, res, next) => {
  try {
    const { vehicle_model, vehicle_category } = req.query;

    // Validate required fields
    if (!vehicle_model) {
      return next(new AppError('Vehicle Model is required.', 400));
    }
    if (!vehicle_category) {
      return next(new AppError('Vehicle Category is required.', 400));
    }

    const docPath = `/DIYDevice/${vehicle_model}`;
    const docRef = db.doc(docPath);
    const doc = await docRef.get();

    if (!doc.exists) {
      return next(new AppError(`No videos found for vehicle model: ${vehicle_model}.`, 404)); // Changed to 404 for "Not Found"
    }

    const data = doc.data();
    // Use a more robust check for the category and provide a default empty array
    const videos = data && data[vehicle_category] ? data[vehicle_category] : [];

    if (videos.length === 0 && data && !data[vehicle_category]) {
      // If the vehicle model exists but the specific category doesn't have videos
      return res.status(200).json({
        status: 200,
        success: true,
        message: `No videos found for category: ${vehicle_category} under model: ${vehicle_model}.`,
        videos: []
      });
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Data is fetched successfully.",
      videos
    });

  } catch (error) {
    // Log the actual error for debugging purposes on the server
    console.error('Error in getVideos:', error);
    // Send a generic error message to the client
    return next(new AppError('Internal Server Error. Please try again later.', 500));
  }
};
uploadData = async (req, res, next) => {
  try {
    let uploadCount = 0;
    for (const collectionName in DATA) {
      if (Object.hasOwnProperty.call(DATA, collectionName)) {
        const documents = DATA[collectionName];
        for (const docData of documents) {
          const docRef = db.collection('DIYDevice').doc(collectionName); // Let Firebase generate doc ID
          let docCategory = typeof (docData.category) != "undefined" ? docData.category : [];
          docRef.update({
            [docCategory]: FieldValue.arrayUnion(docData)
          }).then(() => {
            console.log('Data added to Firebase');
          }).catch((error) => {
            console.error('Error updating document:', error);
          });
          uploadCount++;
        }
      }
    }
    res.status(200).send({ message: `Successfully uploaded ${uploadCount} documents to Firebase.` });
  } catch (error) {
    console.error('Error uploading data to Firebase:', error);
    res.status(500).send({ message: 'Failed to upload data to Firebase', error: error.message });
  }
};
updateVideos = async (req, res, next) => {
    try {
    const { vehicle_model, vehicle_category, data } = req.body;
    console.log("Request Payload",req.body);
    const diyDeviceRef = db.collection('DIYDevice').doc(vehicle_model);
    diyDeviceRef.get().then((doc) => {
    if (doc.exists) {
        const updateVideos = doc.data()[vehicle_category];
        const updateVideoIndex = updateVideos.findIndex(video => video.id === data?.id && video.category === vehicle_category);
        if (updateVideoIndex !== -1) {
            updateVideos[updateVideoIndex].title = data.title;
            updateVideos[updateVideoIndex].url = data.url;
            return diyDeviceRef.update({ updateVideos });
        }
    } else {
        return next(new AppError('No Videos Found', 404));
    }
})
    .then(() => {
      res.status(200).json({
      status: 200,
      success: true,
      message: "Video updated successfully!"
    });
    })
    .catch((error) => {
      console.error("Error updating document: ", error);
      return next(new AppError('Error updating Video', 500));
    });
  }catch (error) {
    // Log the actual error for debugging purposes on the server
    console.error('Error in update videos:', error);
    // Send a generic error message to the client
    return next(new AppError('Internal Server Error. Please try again later.', 500));
  }
};
addVideos = async (req, res, next) => {
  try {
    const { vehicle_model, vehicle_category, data } = req.body;
    const DIYDeviceRef = db.collection('DIYDevice').doc(vehicle_model);
    DIYDeviceRef.update({
      [vehicle_category]: FieldValue.arrayUnion(data)
    }).catch((error) => {
      console.error('Error updating document:', error);
      return next(new AppError('Add Video Error. Please try again later.', 500));
    });
    return res.status(200).json("Data Added Successfully");
  } catch (error) {
    // Log the actual error for debugging purposes on the server
    console.error('Error in getVideos:', error);
    // Send a generic error message to the client
    return next(new AppError('Internal Server Error. Please try again later.', 500));
  }
};

module.exports = { getVideos, addVideos, uploadData,updateVideos }