// v de 15:08 du 26/11/18
// en cours ...
var evision = {

    jsfeat: {
        getCorners: function (context, cols, rows, threshold = 30, draw = true, color = '#0f0') {
            jsfeat.fast_corners.set_threshold(threshold);
            var imageData = context.getImageData(0, 0, cols, rows);
            var dataBuffer = new jsfeat.data_t(cols * rows, imageData.data.buffer);
            var mat = new jsfeat.matrix_t(cols, rows, jsfeat.U8C4_t, dataBuffer);
            var matGray = new jsfeat.matrix_t(mat.cols, mat.rows, jsfeat.U8C1_t);
            jsfeat.imgproc.grayscale(mat.data, mat.cols, mat.rows, matGray);
            var matBlurred = new jsfeat.matrix_t(mat.cols, mat.rows, jsfeat.U8C1_t);
            jsfeat.imgproc.gaussian_blur(matGray, matBlurred, 3);

            var corners = [];
            var i = cols * rows;
            while (--i >= 0) {
                corners[i] = new jsfeat.keypoint_t(0, 0, 0, 0, -1);
            }
            var count = jsfeat.fast_corners.detect(matBlurred, corners, 3);

            if (draw) {
                for (var i = 0; i < count; i++) {
                    context.fillStyle = color;
                    context.fillRect(corners[i].x, corners[i].y, 3, 3);
                }
            }
            return corners;
        }
    },

    tracking: {
        getCorners: function (context, cols, rows, threshold = 30, draw = true, color = '#0f0') {
            tracking.Fast.THRESHOLD = threshold;
            var imageData = context.getImageData(0, 0, cols, rows);
            var gray = tracking.Image.grayscale(imageData.data, cols, rows, true);
            var blurred4 = tracking.Image.blur(gray, cols, rows, 3);
            var blurred1 = new Array(blurred4.length / 4);
            for (var i = 0, j = 0; i < blurred4.length; i += 4, ++j) {
                blurred1[j] = blurred4[i];
            }
            corners = tracking.Fast.findCorners(blurred1, cols, rows);
            if (draw) {
                for (i = 0; i < corners.length; i += 2) {
                    context.fillStyle = color;
                    context.fillRect(corners[i], corners[i + 1], 2, 2);
                }
            }
            return corners;
        },

        getDescriptors: function(context, startX, startY, cols, rows){
            // console.log(context, startX, startY, cols, rows);
            var imageData = context.getImageData(startX, startY, cols, rows);

            var grayImg = tracking.Image.grayscale(
                tracking.Image.blur(
                    imageData.data, cols, rows, blurRadius
                ), cols, rows);

            tracking.Brief.N = 512;
            var corners = tracking.Fast.findCorners(grayImg, cols, rows);
            var descriptors = tracking.Brief.getDescriptors(grayImg, cols, corners);
            return descriptors;
        },

        getTemplateDescriptors: function (canvas, template, videoWidth){
            var matchData =[];
            tracking.Fast.THRESHOLD = 30;
            
            canvas.width=videoWidth + template.width;
            canvas.height=template.height;
            var context=canvas.getContext('2d');
            context.drawImage(template, videoWidth, 0, template.width, template.height);
            var imageData = context.getImageData(videoWidth, 0, template.width, template.height);
            var grayImg = tracking.Image.grayscale(imageData.data, template.width, template.height, true);
            var blurred4 = tracking.Image.blur(grayImg, template.width, template.height, 3);
            var blurred1 = new Array(blurred4.length / 4);
            for (var i = 0, j = 0; i < blurred4.length; i += 4, ++j) {
                blurred1[j] = blurred4[i];
            }
                    
            tracking.Brief.N = 512;
            
            var corners = tracking.Fast.findCorners(blurred1, template.width, template.height);
            var descriptors = tracking.Brief.getDescriptors(blurred1, template.width, corners);
            

            var matchData={'corners':corners, 'descriptors': descriptors};
            return matchData;

        },

        getMatches: function (context, img1cols, img1rows, img2cols, img2rows, draw = true) {
            var blurRadius = 3;

            var imageDataImg1 = context.getImageData(0, 0, img1cols, img1rows);
            var imageDataImg2 = context.getImageData(img1cols, 0, img2cols, img2rows);

            var grayImg1 = tracking.Image.grayscale(
                tracking.Image.blur(
                    imageDataImg1.data, img1cols, img1rows, blurRadius
                ), img1cols, img1rows);
            var grayImg2 = tracking.Image.grayscale(
                tracking.Image.blur(
                    imageDataImg2.data, img2cols, img2rows, blurRadius
                ), img2cols, img2rows);

            tracking.Brief.N = 512;

            var cornersImg1 = tracking.Fast.findCorners(grayImg1, img1cols, img1rows);
            var cornersImg2 = tracking.Fast.findCorners(grayImg2, img2cols, img2rows);

            var descriptorsImg1 = tracking.Brief.getDescriptors(grayImg1, img1cols, cornersImg1);
            var descriptorsImg2 = tracking.Brief.getDescriptors(grayImg2, img2cols, cornersImg2);

            var matches = tracking.Brief.reciprocalMatch(cornersImg1, descriptorsImg1, cornersImg2, descriptorsImg2);

            matches.sort(function (a, b) {
                return b.confidence - a.confidence;
            });

            if (draw) { evision.drawMatches(context, matches, img1cols); }

            return matches;
        },

        getNewMatches: function(context, frame, templateMatchData, showtemplates){
            var blurRadius = 3;

            var imageData = context.getImageData(0, 0, frame.width, frame.height);
            var grayImg = tracking.Image.grayscale(imageData.data, frame.width, frame.height, true);
            var blurred4 = tracking.Image.blur(grayImg, frame.width, frame.height, blurRadius);
            var blurred1 = new Array(blurred4.length / 4);
            for (var i = 0, j = 0; i < blurred4.length; i += 4, ++j) {
                blurred1[j] = blurred4[i];
            }
            tracking.Brief.N = 512;
            var corners = tracking.Fast.findCorners(blurred1, frame.width, frame.height);
            var descriptors = tracking.Brief.getDescriptors(blurred1, frame.width, frame.height);

            var matches = tracking.Brief.reciprocalMatch(corners, descriptors, templateMatchData.corners, templateMatchData.descriptors);
            
            matches.sort(function (a, b) {
                return b.confidence - a.confidence;
            });
            if (showtemplates) { evision.drawMatches(context, matches, frame.width); }

            console.log("nombre de corners : " + templateMatchData.corners.length);
            console.log("nombre de descriptors : " + templateMatchData.descriptors.length);
            console.log("nombre de matches : " + matches.length);

           return matches ;

        }
    },

    drawMatches: function (context, matches, offset) {
        for (var i = 0; i < matches.length; i++) {
            var color = '#' + Math.floor(Math.random() * 16777215).toString(16);
            context.fillStyle = color;
            context.strokeStyle = color;
            context.fillRect(matches[i].keypoint1[0], matches[i].keypoint1[1], 5, 5);
            context.fillRect(matches[i].keypoint2[0] + offset, matches[i].keypoint2[1], 5, 5);
            context.beginPath();
            context.moveTo(matches[i].keypoint1[0], matches[i].keypoint1[1]);
            context.lineTo(matches[i].keypoint2[0] + offset, matches[i].keypoint2[1]);
            context.lineWidth = 1;
            context.stroke();
        }
    }
};