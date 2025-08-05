const { db } = require('../services/firebaseServices');
const { FieldValue } = require('firebase-admin/firestore');
const { DATA } = require('../config/data');
const AppError = require('../utils/AppError');

const getVideos = async (req, res, next) => {
  try {
    const { vehicle_model, vehicle_category } = req.query;
    if (!vehicle_model) return next(new AppError('Vehicle Model is required.', 400));
    if (!vehicle_category) return next(new AppError('Vehicle Category is required.', 400));

    const docPath = `/DIYDevice/${vehicle_model}`;
    const docRef = db.doc(docPath);
    const doc = await docRef.get();

    if (!doc.exists) return next(new AppError(`No videos found for vehicle model: ${vehicle_model}.`, 404));
    const data = doc.data();
    const videos = data && data[vehicle_category] ? data[vehicle_category] : [];
    if (videos.length === 0 && data && !data[vehicle_category]) {
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
    console.error('Error in getVideos:', error);
    return next(new AppError('Internal Server Error. Please try again later.', 500));
  }
};

const uploadData = async (req, res, next) => {
  try {
    let uploadCount = 0;
    for (const collectionName in DATA) {
      if (Object.hasOwnProperty.call(DATA, collectionName)) {
        const documents = DATA[collectionName];
        for (const docData of documents) {
          const docRef = db.collection('DIYDevice').doc(collectionName);
          let docCategory = typeof (docData.category) != "undefined" ? docData.category : [];
          await docRef.update({
            [docCategory]: FieldValue.arrayUnion(docData)
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

const updateVideos = async (req, res, next) => {
  try {
    const { vehicle_model, vehicle_category, data } = req.body;
    const diyDeviceRef = db.collection('DIYDevice').doc(vehicle_model);
    const doc = await diyDeviceRef.get();
    if (doc.exists) {
      const updateVideos = doc.data()[vehicle_category];
      const updateVideoIndex = updateVideos.findIndex(video => video.id === data?.id && video.category === vehicle_category);
      if (updateVideoIndex !== -1) {
        updateVideos[updateVideoIndex].title = data.title;
        updateVideos[updateVideoIndex].url = data.url;
        await diyDeviceRef.update({ [vehicle_category]: updateVideos });
        return res.status(200).json({
          status: 200,
          success: true,
          message: "Video updated successfully!"
        });
      }
    } else {
      return next(new AppError('No Videos Found', 404));
    }
    return next(new AppError('Video not found for update', 404));
  } catch (error) {
    console.error("Error updating document: ", error);
    return next(new AppError('Error updating Video', 500));
  }
};

const addVideos = async (req, res, next) => {
  try {
    const { vehicle_model, vehicle_category, data } = req.body;
    const DIYDeviceRef = db.collection('DIYDevice').doc(vehicle_model);
    await DIYDeviceRef.update({
      [vehicle_category]: FieldValue.arrayUnion(data)
    });
    return res.status(200).json("Data Added Successfully");
  } catch (error) {
    console.error('Error in addVideos:', error);
    return next(new AppError('Internal Server Error. Please try again later.', 500));
  }
};

module.exports = { getVideos, addVideos, uploadData, updateVideos };