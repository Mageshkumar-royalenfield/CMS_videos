const {db} = require('../services/firebaseServices');
const { FieldValue } = require('firebase-admin/firestore');
const { DATA } = require('../config/data')
const AppError = require('../utils/AppError');

getAppUsageVideos = async (req, res, next) => { 
  try {
    const { vehicle_model, vehicle_category } = req.body;
    const docPath = `/ReMechAppUsage/Mechanic`;
    const docRef = db.doc(docPath);
    const doc = await docRef.get();

    if (!doc.exists) {
      return next(new AppError(`No videos found for vehicle model: ${vehicle_model}.`, 404)); // Changed to 404 for "Not Found"
    }

    const data = doc.data();
    // Use a more robust check for the category and provide a default empty array
    const videos = data && data["Videos"] ? data["Videos"] : [];

    if (videos.length === 0 && data && !data["Videos"]) {
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
uploadAppUsageData = async (req, res, next) => {
  try {
    let uploadCount = 0;
    for (const collectionName in DATA) {
      if (Object.hasOwnProperty.call(DATA, collectionName)) {
        const documents = DATA["MECHANIC"];
        for (const docData of documents) {
          const docRef = db.collection('ReMechAppUsage').doc("Mechanic"); // Let Firebase generate doc ID
          docRef.update({
            "Videos": FieldValue.arrayUnion(docData)
          }).then(() => {
          }).catch((error) => {
            console.error('Error updating document:', error);
          });
          uploadCount++;
        }
      }
    }
    res.status(200).send(
      {
        status: 200,
        success: true,
        message: `Successfully uploaded ${uploadCount} documents to Firebase.`
      });
  } catch (error) {
    console.error('Error uploading data to Firebase:', error);
    res.status(500).send({ message: 'Failed to upload data to Firebase', error: error.message });
  }
};
addAppUsageVideos = async (req, res, next) => {
  try {
    const { data } = req.body;
    const DIYDeviceRef = db.collection('ReMechAppUsage').doc("Mechanic");
    DIYDeviceRef.update({
      "Videos": FieldValue.arrayUnion(data)
    }).then(() => {
      console.log('Data added to Firebase!');
    }).catch((error) => {
      console.error('Error updating document:', error);
    });
    return res.status(200).json({
      status: 200,
      success: true,
      message: "Data successfully uploaded to Firebase."
    });
  } catch (error) {
    // Log the actual error for debugging purposes on the server
    console.error('Error in getVideos:', error);
    // Send a generic error message to the client
    return next(new AppError('Internal Server Error. Please try again later.', 500));
  }
};

module.exports = { getAppUsageVideos, addAppUsageVideos, uploadAppUsageData }