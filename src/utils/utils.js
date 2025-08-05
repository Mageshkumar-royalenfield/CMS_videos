const XLSX = require("xlsx");
require("dotenv").config();
const { db, timestamp } = require('../services/firebaseServices');
const { guidedJsonTemplate, precheckJsonTemplate } = require("../config/jsonTemplate");

const dtcColumnHeader = ["Language", "Pcode", "Description", "Priority"];

const preliminaryColumnHeader = [
    "Language",
    "Warning",
    "Caution",
    "BasicCheckPointCount",
    "Description",
    "Image",
    "Caution2",
    "FinalStep",
];

const guidedColumnHeader = [
    "Language",
    "Tool",
    "Step",
    "Header",
    "Caution",
    "Notes",
    "SubSectionName",
    "SubSectionCount",
    "SubStepCount",
    "StepImage",
    "StepDescription",
];
const videoDtcColumnHeader = ["Language", "Pcode", "Description", "Priority"];

exports.parseExcelToJson = (data, args) => {
    return new Promise(async (resolve, reject) => {
        const excelData = XLSX.read(data, { type: "base64" });
        let columnHeader = getTemplateColumns(excelData);
        if (args.contentType === "DTC") {
            let isArrayEqual = arrayDiff(columnHeader, dtcColumnHeader);
            if (isArrayEqual) {
                try {
                    let res = await convertExcelToJson(excelData, args);
                    resolve(res);
                } catch (error) {
                    reject("Data format error, Please check the uploaded excel");
                }
            } else {
                reject("Invalid column name found in DTC excel");
            }
        } else if (args.contentType === "Preliminary") {
            let isArrayEqual = arrayDiff(columnHeader, preliminaryColumnHeader);
            if (isArrayEqual) {
                try {
                    let res = await convertExcelToJson(excelData, args);
                    resolve(res);
                } catch (error) {
                    reject("Data format error, Please check the uploaded excel");
                }
            } else {
                reject("Invalid column name found in Preliminary excel");
            }
        } else if (args.contentType === "Guided") {
            let isArrayEqual = arrayDiff(columnHeader, guidedColumnHeader);
            if (isArrayEqual) {
                try {
                    let res = await convertExcelToJson(excelData, args);
                    resolve(res);
                } catch (error) {
                    reject("Data format error, Please check the uploaded excel");
                }
            } else {
                reject("Invalid column name found in Guided excel");
            }
        }
    });
};

function getTemplateColumns(workbook) {
    let columnHeaders = [];
    let sheet_name_list = workbook.SheetNames;
    for (let sheetIndex = 0; sheetIndex < sheet_name_list.length; sheetIndex++) {
        let worksheet = workbook.Sheets[sheet_name_list[sheetIndex]];
        for (let key in worksheet) {
            let regEx = new RegExp("^(\\w)(1){1}$");
            if (regEx.test(key) == true) {
                columnHeaders.push(worksheet[key].v);
            }
        }
    }

    return columnHeaders;
}

async function convertExcelToJson(excelData, args) {
    let excelJson = XLSX.utils.sheet_to_json(excelData.Sheets.Sheet1);
    try {
        let res = await parseJson(excelJson, args);
        return res;
    } catch (error) {
        throw new Error(error);
    }
}

function arrayDiff(excelColumnHeader, predefinedColumnHeader) {
    let isArrayEqual;

    excelColumnHeader.filter((element) => {
        if (excelColumnHeader.length !== predefinedColumnHeader.length) {
            isArrayEqual = false;
        } else {
            if (predefinedColumnHeader.includes(element)) {
                isArrayEqual = true;
            } else {
                isArrayEqual = false;
            }
        }
    });

    return isArrayEqual;
}

async function parseJson(data, args) {
    const { contentType } = args;
    let jsonArray = data;

    let contentObject = {};
    if (contentType === "DTC") {
        let object = {};
        jsonArray.forEach((element, index) => {
            object[element.Pcode] = {
                description: element.Description,
                priority: element.Priority
            };
        });
        contentObject = object;
    } else if (contentType === "Preliminary") {
        contentObject = getPrecheckJson(data);
    } else if (contentType === "Guided") {
        contentObject = getGuidedJson(data);
    }
    try {
        let response = await insertDataToFirestore(contentObject, args);
        return response;
    } catch (error) {
        throw new Error(error);
    }
}

function getPrecheckJson(precheckJson) {
    let flatJson = precheckJson;
    let nestedJson = JSON.parse(JSON.stringify(precheckJsonTemplate));

    flatJson.forEach((item, index) => {
        // if (item.Language && item.Language.toLowerCase() === language) {
        if (item.FinalStep && item.FinalStep !== "") {
            nestedJson.finalstep = item.FinalStep;
        }
        if (item.Warning && item.Warning !== "") {
            nestedJson.warning = item.Warning;
        }
        if (item.Caution && item.Caution !== "") {
            nestedJson.caution = item.Caution;
        }
        if (item.Caution2 && item.Caution2 !== "") {
            nestedJson.caution2 = item.Caution2;
        }
        let basicCheckPointCount = Number(item.BasicCheckPointCount);
        let description = "";
        let imagePath = [];
        let image = item.Image;
        if (image && image !== "") {
            let imagesArray = image.toString().split("|");
            imagesArray.forEach((imageName) => {
                imagePath.push(
                    imageName.trim()
                    // `file:///storage/emulated/0/RE/dtcImages/${imageName.trim()}.png`
                );
                // imagePath.push(imagePathTemplate[imageName.trim()]);
            });
        }
        if (item.Description && item.Description !== "") {
            description = item.Description;
        }
        let basicCheckpointsObject = {
            description: description,
            imagePath: imagePath,
        };
        nestedJson.basicCheckpoints.push(basicCheckpointsObject);
        // }
    });
    return nestedJson;
}

function getGuidedJson(guidedJson) {
    let flatJson = guidedJson;
    let nestedJson = JSON.parse(JSON.stringify(guidedJsonTemplate));

    flatJson.forEach((item, index) => {
        // if (item.Language && item.Language.toLowerCase() === language) {
        let toolType = item.Tool.toLowerCase();
        let step = Number(item.Step);
        if (toolType) {
            nestedJson[toolType].shouldRender = true;
            if (step) {
                if (item.Header) {
                    //   nestedJson[toolType].steps[step - 1].header.imagePath = [
                    //     require("src/static/images/others/info.png"),
                    //   ];

                    nestedJson[toolType].steps[step - 1].header.description = item.Header;
                }
                if (item.Caution) {
                    // Assuming cautions are added in one line seperated by "|"
                    nestedJson[toolType].steps[step - 1].header.caution = item.Caution
                        ? item.Caution.split("|")
                        : [];
                }
                if (item.Notes) {
                    // Assuming cautions are added in one line seperated by "|"
                    nestedJson[toolType].steps[step - 1].header.notes = item.Notes
                        ? item.Notes.split("|")
                        : [];
                }
                let stepCount = Number(item.SubStepCount);
                let subSectionCount;
                if (item.SubSectionCount === "") {
                    subSectionCount = 1;
                } else {
                    subSectionCount = Number(item.SubSectionCount);
                }
                if (stepCount > 0) {
                    let contentObject = {};
                    let contentName = "";
                    let contentData = [];

                    if (item.SubSectionName) {
                        contentName = item.SubSectionName;
                    }
                    let imagePath = [];
                    let stepImage = item.StepImage;
                    if (stepImage) {
                        let imagesArray = stepImage.toString().split("|");
                        imagesArray.forEach((imageName) => {
                            imagePath.push(
                                imageName.trim()
                            );
                        });
                    }

                    if (stepCount > 1) {
                        contentData =
                            nestedJson[toolType].steps[step - 1].content[subSectionCount - 1]
                                .data;
                        contentName =
                            nestedJson[toolType].steps[step - 1].content[subSectionCount - 1]
                                .name;
                    }
                    contentData.push({
                        description: item.StepDescription,
                        imagePath: imagePath,
                    });

                    contentObject = {
                        name: contentName,
                        data: contentData,
                    };

                    nestedJson[toolType].steps[step - 1].content[subSectionCount - 1] =
                        contentObject;
                }
            }
        }
        // }
    });
    return nestedJson;
}

exports.groupByKey = (array, key) => {
  return array.reduce((result, currentValue) => {
    const groupKey = currentValue[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(currentValue);
    return result;
  }, {});
};

async function initializeFirestorePath(pathArray){
    if (!Array.isArray(pathArray) || pathArray.length === 0) {
        throw new Error('Path array must be a non-empty array of { collection, doc } objects.');
    }

    let currentRef = db;
    let lastDocRef = null;

    for (const step of pathArray) {
        if (!step.collection || !step.doc) {
            throw new Error('Each path step must contain both collection and doc.');
        }

        const docRef = currentRef.collection(step.collection).doc(step.doc);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            await docRef.set({ createdAt: timestamp });
        }
        currentRef = docRef;
        lastDocRef = docRef;
    }

    return lastDocRef;
}
async function insertDataToFirestore(data, args) {
    const {
        pcode,
        contentType,
        vehicleModel,
        language,
        ecuType,
        ecuModel,
        calibrationId
    } = args;
    try {
        let dbRef;
        if (contentType === "Preliminary" || contentType === "Guided") {
            if (pcode === undefined || pcode === "") {
                return {
                    message: `Pcode is required for ${contentType} Template`,
                };
            } else {
                console.log("Pcode", pcode);
                let path = [
                    { collection: language, doc: vehicleModel },
                    { collection: ecuType, doc: ecuModel },
                    { collection: calibrationId.toString(), doc: contentType },
                    { collection: pcode, doc: pcode }
                ];
                await initializeFirestorePath(path);
                dbRef = await db
                    .collection(language)
                    .doc(vehicleModel)
                    .collection(ecuType)
                    .doc(ecuModel)
                    .collection(calibrationId.toString())
                    .doc(contentType)
                    .collection(pcode)
                    .doc(pcode)
                    .set(data, { merge: true });
                if (dbRef) {
                    return {
                        message: `${contentType} data added successfully`,
                    };
                }
            }
        } else {
            if (contentType === "DTC") {
                let path = [
                    { collection: language, doc: vehicleModel },
                    { collection: ecuType, doc: ecuModel },
                    { collection: calibrationId.toString(), doc: contentType }];
                    console.log("path", path);
                await initializeFirestorePath(path);
                dbRef = await db
                    .collection(language)
                    .doc(vehicleModel)
                    .collection(ecuType)
                    .doc(ecuModel)
                    .collection(calibrationId.toString())
                    .doc(contentType)
                    .set(data, { merge: true });
                if (dbRef) {
                    return {
                        message: `${contentType} data added successfully`,
                    };
                }
            }
        }
    } catch (error) {
        throw new Error(error);
    }
}

exports.readExcelFile = async (path) => {
    try {
        const file = XLSX.readFile(path);
        let data = []
        const sheets = file.SheetNames
        for (let i = 0; i < sheets.length; i++) {
            const temp = XLSX.utils.sheet_to_json(
                file.Sheets[file.SheetNames[i]])
            temp.forEach((res) => {
                data.push(res)
            })
        }
        return data;
    }
    catch (err) {
        console.log(err);
    }
}