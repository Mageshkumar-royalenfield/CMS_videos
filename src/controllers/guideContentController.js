const axios = require("axios");
require("dotenv").config();
const FormData = require("form-data");
const { FieldValue } = require('firebase-admin/firestore');
const { parseExcelToJson, readExcelFile, groupByKey } = require("../utils/utils");
const { db } = require("../services/firebaseServices");
const fs = require('fs');
const path = require('path');

const uploadContentToFirestore = async (req, res) => {
  try {
    const reqBody = req.body;
    const data = new FormData();
    data.append("containerName", reqBody.containerName);
    data.append("dirName", reqBody.dirName);
    data.append("fileName", reqBody.fileName);

    const config = {
      method: "post",
      url: `${process.env.RE_UTILITY_API}/downloadFilesFromAzure`,
      headers: {
        app_id: process.env.RE_APP_ID,
        "Content-Type": `multipart/form-data, boundary=${data._boundary}`,
        Authorization: `Bearer ${process.env.RE_APP_KEY}`,
        ...data.getHeaders(),
      },
      data: data
    };

    const response = await axios(config);
    const { data: respData } = response;

    if (respData.code === "200" && respData.data) {
      if (
        reqBody.contentType &&
        reqBody.ecuModel &&
        reqBody.ecuType &&
        reqBody.language &&
        reqBody.vehicleModel &&
        reqBody.calibrationId &&
        reqBody.containerName &&
        reqBody.fileName &&
        reqBody.dirName &&
        reqBody.timestamp &&
        reqBody.versionCode
      ) {
        let dtc = reqBody.contentType === "DTC" ? "N/A" : reqBody.pcode;
        let result = await parseExcelToJson(respData.data, reqBody);
        if (result) {
          return res.json({ result });
        }
      }
    } else {
      if (respData.error) console.log("Error", respData.error);
      return res.status(400).json({ error: respData.errorMessage || respData.error });
    }
  } catch (error) {
    console.error('Error in uploadContentToFirestore:', error);
    return res.status(500).json({ error: error.message });
  }
};

const bulkUploadToFirebase = () => {
  const inputData = JSON.parse(fs.readFileSync('../config/data', 'utf8'));
  db
    .database()
    .ref('data')
    .set(inputData)
    .then(() => {
      console.log('Data import successful');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Import failed:', err);
      process.exit(1);
    });
};

const uploadVideosToFirestore = async (req, res) => {
  try {
    const { language, vehicleModel, ecuType, ecuModel, calibrationId, contentType } = req.body || {};
    if (!language || !vehicleModel || !ecuType || !ecuModel || !calibrationId || !contentType) {
      return res.status(400).json({ error: 'Missing required fields: language, vehicleModel, ecuType, ecuModel, calibrationId, contentType' });
    }

    const excelFile = path.resolve(__dirname, "../config/DTC_Videos.xlsx");
    const videoData = await readExcelFile(excelFile);
    const videoGroupByPcode = groupByKey(videoData, 'Pcode');
    const videoRef = db
      .collection(language)
      .doc(vehicleModel)
      .collection(ecuType)
      .doc(ecuModel)
      .collection(calibrationId.toString())
      .doc(contentType);

    const batch = db.batch();
    Object.entries(videoGroupByPcode).forEach(([key, videos]) => {
      const cleanedVideos = videos.map(({ Language, Pcode, Priority, Description, ...rest }) => rest);
      batch.update(videoRef, {
        [`${key}.Videos`]: FieldValue.arrayUnion(...cleanedVideos)
      });
    });

    await batch.commit();
    res.json({ message: 'Videos uploaded successfully' });
  } catch (error) {
    console.error('Error uploading videos:', error);
    res.status(500).json({ error: 'Error uploading videos: ' + error.message });
  }
};

const getContentfromFirebase = async (req, res) => {
  try {
    const collectionRef = db.collection('English').doc("Scram").collection("ABS").doc("ABS - Bosch").collection("700").doc("Preliminary").collection("U2922");
    const snapshot = await collectionRef.get();
    if (snapshot.empty) {
      return res.status(404).json({ message: 'No matching documents.' });
    }
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, data: doc.data() });
    });
    res.json(docs);
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { uploadContentToFirestore, getContentfromFirebase, uploadVideosToFirestore };