const express = require('express');
const router = express.Router();
const {authenticate} = require('../middleware/authenticationMiddleware')
const { getVideos,addVideos,uploadData,updateVideos } = require('../controllers/DiyVideoController');
const { getAppUsageVideos,uploadAppUsageData,addAppUsageVideos } = require('../controllers/appUsageController');
const { uploadContentToFirestore,getContentfromFirebase,uploadVideosToFirestore} = require('../controllers/guideContentController');

router.get('/api/v1/diyvideos',authenticate, getVideos).post('/api/v1/diyvideos',authenticate, addVideos).put('/api/v1/diyvideos',authenticate, updateVideos).post('/api/v1/diyvideos/upload-data',authenticate,uploadData);
router.get('/api/v1/app-usage',authenticate, getAppUsageVideos).post('/api/v1/app-usage/upload-data',authenticate, uploadAppUsageData).post('/api/v1/app-usage',authenticate, addAppUsageVideos);
router.post('/api/v1/guided-content',authenticate, uploadContentToFirestore).get('/api/v1/get-guided-content',authenticate, getContentfromFirebase);
router.post('/api/v1/guided-content/upload-videos',authenticate, uploadVideosToFirestore);
module.exports = router;