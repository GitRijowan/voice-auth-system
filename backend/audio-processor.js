const ffmpeg = require('fluent-ffmpeg');
const crypto = require('crypto');
const fs = require('fs');

// Set FFmpeg path (required on Windows)
ffmpeg.setFfmpegPath('C:/ffmpeg/bin/ffmpeg.exe'); // Update with your FFmpeg path

class AudioProcessor {
  static async extractVoiceprint(audioPath) {
    return new Promise((resolve, reject) => {
      // Convert to WAV format with optimized settings for speed
      const outputPath = audioPath + '.wav';

      ffmpeg(audioPath)
        .toFormat('wav')
        .audioChannels(1)
        .audioFrequency(8000) // Reduced from 16000
        .audioBitrate('16k') // Reduced bitrate for faster processing
        .duration(2) // Limit to 2 seconds for consistency
        .on('error', (err) => {
          reject(err);
        })
        .on('end', () => {
          // Read the converted file and create a hash
          const fileBuffer = fs.readFileSync(outputPath);
          const hashSum = crypto.createHash('sha256');
          hashSum.update(fileBuffer);
          const hex = hashSum.digest('hex');

          // Clean up the temporary file
          fs.unlinkSync(outputPath);

          resolve(hex);
        })
        .save(outputPath);
    });
  }
}

module.exports = AudioProcessor;