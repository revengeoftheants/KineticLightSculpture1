/*
 * Methods for analyzing audio.
 *
 * Based on Hobovis by Lodewijk Bogarrds. http://www.chromeexperiments.com/detail/hobovis/?f=
 *
 * This uses a Self-Executing Anonymous Function to declare the namespace "AudioAnalyzer" and create public and private members within in.
 *
 * @author Kevin Dean
 */

/*
 * @param AudioAnalyzer: Defines the namespace to use for public members of this class.
 * @param $: The shorthand to use for jQuery.
 * @param undefined: Nothing should be passed via this parameter. This ensures that you can use "undefined" here without worrying that another loaded
 *        script as redefined the global variable "undefined".
 */
(function(AudioAnalyzer, $, undefined) {


    /**********************
     * Global constants
     **********************/
    var SAMPLE_CNT = 256;  // SoundManager2's sample size for its FFT.
    var CUTOFF_FREQ = 500;  // 500hz
    var LOW_FREQ_BAND_CNT =  Math.round(CUTOFF_FREQ / (22050 / SAMPLE_CNT));
    var EQ_FALL_SPEED = 0.05;


    /**********************
     * Global variables
     **********************/
    var _beat = null;
    var _lowFreqBandSamples;  // Stores samples for the low frequency ranges
    var _lowFreqBandSamplesIdx = 0;
    var _lowHurdleNbr = null;
    var _lowHurdleDecayNbr = 2;
    var _prevMuteInd = false;




        /*
     * Initializes arrays for holding data about the low frequence bands, where the beat resides.
     */
    AudioAnalyzer.InitBeatRangeSamples = function() {
        _lowFreqBandSamplesIdx = 0;

        _lowFreqBandSamples = new Array(SAMPLE_CNT);

        for (var idx = 0; idx < SAMPLE_CNT; idx++) {
        _lowFreqBandSamples[idx] = new Array(LOW_FREQ_BAND_CNT);
        }
    }



    /*
     * Detects a beat.
     *
     * @param inpEQData: Object containing two arrays of 256 floating-point values from 0 to 1 (FFT data).
     */
    AudioAnalyzer.DetectBeat = function(inpEQData) {
        updtBeatRangeSamples(inpEQData);
        var beatRangeWeightNbrs = rtrvBeatRangeWeights();

        var maxSampleNbr = inpEQData.left[0];

        for (freqBandNbr = 0; freqBandNbr < LOW_FREQ_BAND_CNT; freqBandNbr++) {
            maxSampleNbr = Math.max(maxSampleNbr, inpEQData.left[freqBandNbr] * beatRangeWeightNbrs[freqBandNbr]); 
        }

        var currLvlNbr = maxSampleNbr;

        // As the music changes level, our hurdle for what constitutes a beat changes as well.
        if (currLvlNbr >= _lowHurdleNbr || _lowHurdleNbr === null) {
            _lowHurdleDecayNbr = 2;
        } else if (currLvlNbr < _lowHurdleNbr) {
            // If we didn't meet the low hurdle, apply a decay factor to it.
            currLvlNbr = _lowHurdleNbr - (_lowHurdleDecayNbr/50);
            _lowHurdleDecayNbr++;
        }

        _lowHurdleNbr = currLvlNbr;

        return (isNaN(currLvlNbr)) ? 0 : currLvlNbr;
    };



    /*
     * Toggles the audio mute.
     *
     * @param inpMuteInd: Indicates whether or not audio should be muted.
     */
    AudioAnalyzer.SetMuteState = function(inpMuteInd) {

        if (inpMuteInd != _prevMuteInd) {
            if (inpMuteInd) {
               soundManager.mute();
            } else {
                soundManager.unmute();
            }
        }

        _prevMuteInd = inpMuteInd;
    }



    AudioAnalyzer.RtrvFallEqData = function(inEqData) {

        var rtnEqData = { left : [], right : [] };

        if (typeof prevEqData == "undefined") {
            prevEqData = { left : [], right : [] };
        }
        
        var sampleIdx;

        for (sampleIdx = 0; sampleIdx < SAMPLE_CNT; sampleIdx++) {

            var leftSampleNbr = inEqData.left[sampleIdx];
            var prevLeftSampleNbr = prevEqData.left[sampleIdx];
            var rightSampleNbr = inEqData.right[sampleIdx];
            var prevRightSampleNbr = prevEqData.right[sampleIdx];

            leftSampleNbr = (leftSampleNbr < prevLeftSampleNbr) ? Math.max(0, prevLeftSampleNbr - EQ_FALL_SPEED) : leftSampleNbr;
            rightSampleNbr = rightSampleNbr < prevRightSampleNbr ? Math.max(0, prevRightSampleNbr - EQ_FALL_SPEED) : rightSampleNbr;

            rtnEqData.left[sampleIdx]  = leftSampleNbr;
            rtnEqData.right[sampleIdx] = rightSampleNbr;
        }

        for (sampleIdx = 0; sampleIdx < SAMPLE_CNT; sampleIdx++) {
            prevEqData.left[sampleIdx]  = rtnEqData.left[sampleIdx];
            prevEqData.right[sampleIdx] = rtnEqData.right[sampleIdx];
        }

        return rtnEqData;
    };




    /**********************
     * Private methods
     **********************/


    /*
     * Updates the beat range.
     *
     * @param inpEQData: Object containing two arrays of 256 floating-point values from 0 to 1 (FFT data).
     */
    function updtBeatRangeSamples(inpEQData) {
        var sampleIdx = _lowFreqBandSamplesIdx % SAMPLE_CNT;

        for (var freqBandIdx = 0; freqBandIdx < LOW_FREQ_BAND_CNT; freqBandIdx++) {
        _lowFreqBandSamples[sampleIdx][freqBandIdx] = Math.max(inpEQData.left[freqBandIdx], inpEQData.right[freqBandIdx]);
        }

        _lowFreqBandSamplesIdx++;
    }



    /*
     * Retrieves the weight for each frequency band used to detect beats.
     */
    function rtrvBeatRangeWeights() {
        var sampleCnt = _lowFreqBandSamplesIdx < SAMPLE_CNT ? _lowFreqBandSamplesIdx : SAMPLE_CNT;

        // find avg 
        var freqBandAvgs = new Array(LOW_FREQ_BAND_CNT);
        var freqBandNbr;
        var sampleIdx;

        for (freqBandNbr = 0; freqBandNbr < LOW_FREQ_BAND_CNT; freqBandNbr++) {
            var weightNbr = 0;

            for (sampleIdx = 0; sampleIdx < sampleCnt; sampleIdx++) {
                weightNbr += _lowFreqBandSamples[sampleIdx][freqBandNbr];
            }

            freqBandAvgs[freqBandNbr] = weightNbr / sampleCnt;
        }

        // Count below average & above average and get spreads
        var freqBandLowCnts = new Array(LOW_FREQ_BAND_CNT);
        var freqBandHighCnts = new Array(LOW_FREQ_BAND_CNT);
        var freqBandLowHighSpreads = new Array(LOW_FREQ_BAND_CNT);
        var freqBandDistances = new Array(LOW_FREQ_BAND_CNT);

        for (freqBandNbr = 0; freqBandNbr < LOW_FREQ_BAND_CNT; freqBandNbr++) {

            var freqBandBelowAvgSampleCnt = 0, freqBandAboveAvgSampleCnt = 0, distanceBetweenFreqBandSampleVals = 0;
            var  minValFromAllSamples = _lowFreqBandSamples[0][freqBandNbr], maxValFromAllSamples = _lowFreqBandSamples[0][freqBandNbr];

            for (sampleIdx = 0; sampleIdx < sampleCnt; sampleIdx++) {
                minValFromAllSamples = Math.min(minValFromAllSamples, _lowFreqBandSamples[sampleIdx][freqBandNbr]);
                maxValFromAllSamples = Math.max(maxValFromAllSamples, _lowFreqBandSamples[sampleIdx][freqBandNbr]);

                if (sampleIdx > 1) {
                    distanceBetweenFreqBandSampleVals += Math.abs(_lowFreqBandSamples[sampleIdx - 1][freqBandNbr] - _lowFreqBandSamples[sampleIdx][freqBandNbr]); 
                }

                if (_lowFreqBandSamples[sampleIdx][freqBandNbr] < freqBandAvgs[freqBandNbr]) {
                    freqBandBelowAvgSampleCnt++;
                }
                else {
                    freqBandAboveAvgSampleCnt++;
                }
            }

            freqBandLowCnts[freqBandNbr] = freqBandBelowAvgSampleCnt;
            freqBandHighCnts[freqBandNbr] = freqBandAboveAvgSampleCnt;
            freqBandLowHighSpreads[freqBandNbr] = maxValFromAllSamples - minValFromAllSamples;
            freqBandDistances[freqBandNbr] = distanceBetweenFreqBandSampleVals;
        }
      

        // dDetermine weight by preferring bigger a freqBandLowHighSpread and a bigger freqBandLowHighSpread of freqBandLowCnts and freqBandHighCnts.
        var rtnBeatRangeWeights = new Array(LOW_FREQ_BAND_CNT);
        var minFreqBandWeight = null;
        var maxFreqBandWeight = null;

        for (freqBandNbr = 0; freqBandNbr < LOW_FREQ_BAND_CNT; freqBandNbr++) {
            rtnBeatRangeWeights[freqBandNbr] = Math.pow(freqBandLowHighSpreads[freqBandNbr], 16) * freqBandDistances[freqBandNbr];
            minFreqBandWeight = (minFreqBandWeight === null) ? rtnBeatRangeWeights[freqBandNbr] : Math.min(rtnBeatRangeWeights[freqBandNbr], minFreqBandWeight);     
            maxFreqBandWeight = (maxFreqBandWeight === null) ? rtnBeatRangeWeights[freqBandNbr] : Math.max(rtnBeatRangeWeights[freqBandNbr], maxFreqBandWeight);     
        }

        // Normalize weights    
        for (freqBandNbr = 0; freqBandNbr < LOW_FREQ_BAND_CNT; freqBandNbr++) {
            rtnBeatRangeWeights[freqBandNbr] = (rtnBeatRangeWeights[freqBandNbr] - minFreqBandWeight) / (maxFreqBandWeight - minFreqBandWeight); 
        }

        return rtnBeatRangeWeights;
    }


} (window.AudioAnalyzer = window.AudioAnalyzer || {}, jQuery) );