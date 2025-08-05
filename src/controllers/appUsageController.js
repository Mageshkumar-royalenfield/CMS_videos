const { db } = require('../services/firebaseServices');
const { FieldValue } = require('firebase-admin/firestore');
const { DATA } = require('../config/data');
const AppError = require('../utils/AppError');

const getAppUsageVideos = async (req, res, next) => {
  try {
    const { vehicle_model, vehicle_category } = req.body;
    const docPath = `/ReMechAppUsage/Mechanic`;
    const docRef = db.doc(docPath);
    const doc = await docRef.get();

    if (!doc.exists) return next(new AppError(`No videos found for vehicle model: ${vehicle_model}.`, 404));
    const data = doc.data();
    const videos = data && data["Videos"] ? data["Videos"] : [];
    if (videos.length === 0 && data && !data["Videos"]) {
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
    console.error('Error in getAppUsageVideos:', error);
    return next(new AppError('Internal Server Error. Please try again later.', 500));
  }
};

const uploadAppUsageData = async (req, res, next) => {
  try {
    let uploadCount = 0;
    const documents = DATA["MECHANIC"];
    for (const docData of documents) {
      const docRef = db.collection('ReMechAppUsage').doc("Mechanic");
      await docRef.update({
        "Videos": FieldValue.arrayUnion(docData)
      });
      uploadCount++;
    }
    res.status(200).send({
      status: 200,
      success: true,
      message: `Successfully uploaded ${uploadCount} documents to Firebase.`
    });
  } catch (error) {
    console.error('Error uploading data to Firebase:', error);
    res.status(500).send({ message: 'Failed to upload data to Firebase', error: error.message });
  }
};

const addAppUsageVideos = async (req, res, next) => {
  try {
    const { data } = req.body;
    const DIYDeviceRef = db.collection('ReMechAppUsage').doc("Mechanic");
    await DIYDeviceRef.update({
      "Videos": FieldValue.arrayUnion(data)
    });
    return res.status(200).json({
      status: 200,
      success: true,
      message: "Data successfully uploaded to Firebase."
    });
  } catch (error) {
    console.error('Error in addAppUsageVideos:', error);
    return next(new AppError('Internal Server Error. Please try again later.', 500));
  }
};

module.exports = { getAppUsageVideos, addAppUsageVideos, uploadAppUsageData };