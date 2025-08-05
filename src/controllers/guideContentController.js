const axios = require("axios");
require("dotenv").config();
const FormData = require("form-data");
const {FieldValue } = require('firebase-admin/firestore');
const { parseExcelToJson,readExcelFile,initializeFirestorePath, groupByKey } = require("../utils/utils");
const { db } = require("../services/firebaseServices");
const fs = require('fs');
const path = require('path');

uploadContentToFirestore = (req, res) => {
  return new Promise(async (resolve, reject) => {
    // console.log("req.body", req.body);
    let reqBody = req.body;
    let data = new FormData();
    data.append("containerName", reqBody.containerName);
    data.append("dirName", reqBody.dirName);
    data.append("fileName", reqBody.fileName);
    let config = {
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
    axios(config)
      .then(async (response) => {
        const { data } = response;
        if (data.code === "200" && data.data) {
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
            let dtc = "";
            if (reqBody.contentType === "DTC") {
              dtc = "N/A";
            } else {
              dtc = reqBody.pcode;
            }
            // let dataCount = await checkDuplicateRecords(dtc, reqBody);
            // if (dataCount > 0) {
            //   reject(new Error("Data already exists"));
            // }
            let result = await parseExcelToJson(data.data, reqBody);
            if (result) {
              resolve(result);
              res.json({ result });
            }
            // if (result) {
            //   mysqlPool.getConnection((err, connection) => {
            //     if (err) throw err;

            //     let query =
            //       "INSERT INTO CmsAudit set loginId='" +
            //       context.loggedinuserid +
            //       "', vehicleModel='" +
            //       reqBody.vehicleModel +
            //       "', userName='" +
            //       username +
            //       "', ecuType='" +
            //       reqBody.ecuType +
            //       "', ecuModel='" +
            //       reqBody.ecuModel +
            //       "', fileName='" +
            //       reqBody.fileName +
            //       "', calibrationId='" +
            //       reqBody.calibrationId +
            //       "', dtc='" +
            //       dtc +
            //       "', versionCode='" +
            //       reqBody.versionCode +
            //       "', language='" +
            //       reqBody.language +
            //       "', contentType='" +
            //       reqBody.contentType +
            //       "', timestamp='" +
            //       reqBody.timestamp +
            //       "'";

            //     connection.query(
            //       query,
            //       function (error, results, fields) {
            //         connection.release();

            //         if (error) {
            //           reject(new Error(error));
            //         } else {
            //           resolve(result);
            //         }
            //       }
            //     );
            //   });
            // }
          }
        } else {
          if (data.error) console.log("Error", data.error); reject(new Error(data.errorMessage));
          res.json({ error: data.error })
        }
      })
      .catch((error) => {
        // res.json({ error })
        reject(new Error(error));
      });
    // }
  });
}
bulkUploadToFirebase = () =>{
// Load your JSON data
const inputData = JSON.parse(fs.readFileSync('../config/data', 'utf8'));
db
  .database()
  .ref('data') // Core: writing under 'data'
  .set(inputData)
  .then(() => {
    console.log('Data import successful');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  });
}
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

    // Use batch for atomic updates
    const batch = db.batch();
    Object.entries(videoGroupByPcode).forEach(([key, videos]) => {
      // Clean up video objects
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
}
getContentfromFirebase = async () => {
const collectionRef = db.collection('English').doc("Scram").collection("ABS").doc("ABS - Bosch").collection("700").doc("Preliminary").collection("U2922");
const snapshot = await collectionRef.get();
if (snapshot.empty) {
  console.log('No matching documents.');
  return;
}

snapshot.forEach(doc => {
  console.log(doc.id, '=>', doc.data());
});
}
module.exports = { uploadContentToFirestore, getContentfromFirebase, uploadVideosToFirestore }