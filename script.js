console.log('Starting FFmpeg import...');

// Global variables
let ffmpeg = null;
let fetchFile = null;

// Initialize the application
async function initializeApp() {
    try {
        // Try to import from local node_modules
        const module = await import('./node_modules/@ffmpeg/ffmpeg/dist/esm/index.js');
        
        if (module.FFmpeg && typeof module.FFmpeg === 'function') {
            // New API (class-based)
            const FFmpegClass = module.FFmpeg;
            
            fetchFile = module.fetchFile || (async (file) => {
                return new Uint8Array(await file.arrayBuffer());
            });
            
            ffmpeg = new FFmpegClass({
                log: true,
                logger: ({ message }) => console.log('[FFmpeg]', message),
                corePath: './node_modules/@ffmpeg/core/dist/ffmpeg-core.js',
            });
            
            console.log('Using local FFmpeg (new API)');
        } else {
            throw new Error('New API not available');
        }
        
        // Load FFmpeg
        updateStatus('Loading FFmpeg core (this may take a moment)...', 'loading');
        await ffmpeg.load();
        
        console.log('FFmpeg loaded successfully');
        updateStatus('FFmpeg loaded successfully! Ready to process videos.', 'ready');
        document.getElementById('mainContent').classList.remove('hidden');
        
        // Setup event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Failed to load local FFmpeg:', error);
        updateStatus(`Error: ${error.message}. Trying CDN fallback...`, 'error');
        
        // Try CDN fallback
        setTimeout(() => loadFromCDN(), 1000);
    }
}

// CDN fallback function
async function loadFromCDN() {
    try {
        updateStatus('⏳ Trying CDN fallback (older stable API)...', 'loading');
        
        // Load from CDN
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.10.1/dist/ffmpeg.min.js';
        
        await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        
        // Older CDN version exposes createFFmpeg globally
        const { createFFmpeg, fetchFile: cdnFetchFile } = window.FFmpeg;
        
        ffmpeg = createFFmpeg({
            log: true,
            corePath: 'https://unpkg.com/@ffmpeg/core@0.8.5/dist/ffmpeg-core.js',
            progress: ({ ratio }) => {
                const percent = Math.round(ratio * 100);
                updateProgress(percent);
            }
        });
        
        fetchFile = cdnFetchFile;
        
        await ffmpeg.load();
        
        console.log('CDN FFmpeg loaded successfully');
        updateStatus('✅ FFmpeg loaded from CDN! Ready to process videos.', 'ready');
        document.getElementById('mainContent').classList.remove('hidden');
        
        // Setup event listeners
        setupEventListeners();
        
    } catch (cdnError) {
        console.error('CDN load failed:', cdnError);
        updateStatus(`❌ Failed to load from CDN: ${cdnError.message}`, 'error');
    }
}

// Update status display
function updateStatus(message, type = 'loading') {
    const statusEl = document.getElementById('status');
    const loader = type === 'loading' ? '<div class="loader" style="display: inline-block; margin-right: 10px;"></div>' : '';
    statusEl.innerHTML = `${loader}<span>${message}</span>`;
    statusEl.className = `status-${type}`;
}

// Update progress bar
function updateProgress(percent) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    if (progressFill) {
        progressFill.style.width = `${percent}%`;
        progressText.textContent = `${percent}%`;
    }
}

// Update processing steps
function updateStep(stepNumber, status) {
    const stepEl = document.getElementById(`step${stepNumber}`);
    if (stepEl) {
        stepEl.className = `step ${status}`;
        
        // Update progress bar based on step
        let progressPercent = 0;
        if (stepNumber === 1 && status === 'active') progressPercent = 15;
        if (stepNumber === 1 && status === 'completed') progressPercent = 30;
        if (stepNumber === 2 && status === 'active') progressPercent = 45;
        if (stepNumber === 2 && status === 'completed') progressPercent = 60;
        if (stepNumber === 3 && status === 'active') progressPercent = 75;
        if (stepNumber === 3 && status === 'completed') progressPercent = 90;
        if (stepNumber === 4 && status === 'active') progressPercent = 95;
        if (stepNumber === 4 && status === 'completed') progressPercent = 100;
        
        updateProgress(progressPercent);
    }
}

// State variables
let videoFile = null;
let vttContent = null;

// Setup event listeners
function setupEventListeners() {
    const videoInput = document.getElementById('videoInput');
    const vttInput = document.getElementById('vttInput');
    const vttTextarea = document.getElementById('vttContent');
    const processBtn = document.getElementById('processBtn');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    const videoPreview = document.getElementById('videoPreview');
    const outputVideo = document.getElementById('outputVideo');
    const downloadLink = document.getElementById('downloadLink');
    const progressContainer = document.getElementById('progressContainer');
    const resultDiv = document.getElementById('result');
    const resetBtn = document.getElementById('resetBtn');
    const videoInfo = document.getElementById('videoInfo');
    const vttInfo = document.getElementById('vttInfo');
    const timeEstimate = document.getElementById('timeEstimate');
    
    // Event listeners
    videoInput.addEventListener('change', handleVideoUpload);
    vttInput.addEventListener('change', handleVTTUpload);
    vttTextarea.addEventListener('input', handleVTTInput);
    processBtn.addEventListener('click', processVideo);
    resetBtn.addEventListener('click', resetApp);
    
    async function handleVideoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
            alert(`File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please use a video under 50MB.`);
            videoInput.value = '';
            return;
        }
        
        videoFile = file;
        
        // Show file info
        videoInfo.innerHTML = `
            <div>${file.name}</div>
            <div>${(file.size / (1024 * 1024)).toFixed(2)} MB</div>
        `;
        
        // Show preview
        const url = URL.createObjectURL(file);
        videoPreview.src = url;
        videoPreview.classList.remove('hidden');
        
        checkReadyState();
    }
    
    async function handleVTTUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        vttContent = await file.text();
        vttTextarea.value = vttContent;
        
        vttInfo.innerHTML = `
            <div>${file.name}</div>
            <div>${(file.size / 1024).toFixed(2)} KB</div>
        `;
        
        checkReadyState();
    }
    
    function handleVTTInput(event) {
        vttContent = event.target.value.trim();
        if (vttContent) {
            vttInfo.innerHTML = '<div>Text input</div>';
        } else {
            vttInfo.innerHTML = '';
        }
        checkReadyState();
    }
    
    function checkReadyState() {
        const processBtn = document.getElementById('processBtn');
        processBtn.disabled = !(videoFile && vttContent);
    }
    
    async function processVideo() {
        if (!videoFile || !vttContent) {
            alert('Please select both files.');
            return;
        }
        
        try {
            // Update UI
            processBtn.disabled = true;
            btnText.textContent = 'Processing...';
            btnLoader.classList.remove('hidden');
            progressContainer.classList.remove('hidden');
            
            // Reset steps
            updateStep(1, 'pending');
            updateStep(2, 'pending');
            updateStep(3, 'pending');
            updateStep(4, 'pending');
            
            // Update time estimate based on file size
            const videoSizeMB = videoFile.size / (1024 * 1024);
            timeEstimate.textContent = `Processing video (${videoSizeMB.toFixed(1)}MB)...`;
            
            updateStatus('⏳ Processing video...', 'loading');
            
            // Step 1: Preparing files
            console.log('Step 1: Preparing files...');
            updateStep(1, 'active');
            
            // Write files using the new API
            console.log('Writing video file...');
            const videoData = await fetchFile(videoFile);
            await ffmpeg.writeFile('input.mp4', videoData);
            
            console.log('Writing caption file...');
            // Convert string to Uint8Array for VTT file
            const vttEncoder = new TextEncoder();
            const vttData = vttEncoder.encode(vttContent);
            await ffmpeg.writeFile('captions.vtt', vttData);
            
            updateStep(1, 'completed');
            
            // Step 2: Convert VTT to MOV_TEXT format (MP4-compatible subtitles)
            console.log('Step 2: Converting VTT to MP4 subtitle format...');
            updateStep(2, 'active');
            updateStatus('⏳ Converting subtitle format...', 'loading');
            
            try {
                // First convert VTT to SRT (intermediate format)
                console.log('Converting VTT to SRT...');
                await ffmpeg.exec([
                    '-i', 'captions.vtt',
                    'captions.srt'
                ]);
                
                // Now convert SRT to MOV_TEXT format (MP4 embedded subtitles)
                console.log('Converting SRT to MOV_TEXT (MP4 subtitles)...');
                await ffmpeg.exec([
                    '-i', 'input.mp4',
                    '-i', 'captions.srt',
                    '-c:v', 'copy',           // Copy video stream without re-encoding
                    '-c:a', 'copy',           // Copy audio stream without re-encoding
                    '-c:s', 'mov_text',       // Use MOV_TEXT subtitle codec (MP4 compatible)
                    '-metadata:s:s:0', 'language=eng',
                    '-metadata:s:s:0', 'title=English Subtitles',
                    '-map', '0:v',            // Map video from first input
                    '-map', '0:a',            // Map audio from first input
                    '-map', '1',              // Map subtitles from second input
                    '-y',                     // Overwrite output
                    'output.mp4'
                ]);
                
            } catch (e) {
                console.log('MOV_TEXT approach failed, trying alternative...');
                // Try alternative approach
                await ffmpeg.exec([
                    '-i', 'input.mp4',
                    '-i', 'captions.vtt',
                    '-c:v', 'copy',
                    '-c:a', 'copy',
                    '-c:s', 'mov_text',
                    '-metadata:s:s:0', 'language=eng',
                    '-metadata:s:s:0', 'title=English Subtitles',
                    '-map', '0:v',
                    '-map', '0:a',
                    '-map', '1',
                    '-y',
                    'output.mp4'
                ]);
            }
            
            updateStep(2, 'completed');
            
            // Step 3: Merging subtitles with video
            console.log('Step 3: Merging subtitles with video...');
            updateStep(3, 'active');
            updateStatus('Merging subtitles with video...', 'loading');
            
            // This step is completed by the FFmpeg command above
            updateStep(3, 'completed');
            
            // Step 4: Finalizing output
            console.log('Step 4: Finalizing output...');
            updateStep(4, 'active');
            updateStatus('Finalizing video...', 'loading');
            
            const outputData = await ffmpeg.readFile('output.mp4');
            
            // Create blob and URL for the output video
            const blob = new Blob([outputData], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            
            // Display result with track element for browser playback
            outputVideo.innerHTML = ''; // Clear any previous content
            
            const source = document.createElement('source');
            source.src = url;
            source.type = 'video/mp4';
            outputVideo.appendChild(source);
            
            // Add track element for browser subtitles
            const track = document.createElement('track');
            track.kind = 'subtitles';
            track.label = 'English';
            track.srclang = 'en';
            track.default = true;
            
            // Create blob URL for VTT content
            const vttBlob = new Blob([vttContent], { type: 'text/vtt' });
            track.src = URL.createObjectURL(vttBlob);
            outputVideo.appendChild(track);
            
            // Enable subtitles by default
            outputVideo.textTracks[0].mode = 'showing';
            
            downloadLink.href = url;
            resultDiv.classList.remove('hidden');
            
            updateStep(4, 'completed');
            
            // Scroll to result
            resultDiv.scrollIntoView({ behavior: 'smooth' });
            
            // Complete
            updateStatus('Video processed successfully!', 'ready');
            btnText.textContent = 'Embed Captions in Video';
            btnLoader.classList.add('hidden');
            timeEstimate.textContent = 'Processing complete';
            
        } catch (error) {
            console.error('Processing error:', error);
            
            updateStatus(`Error: ${error.message}`, 'error');
            
            // Show user-friendly error message
            let errorMsg = `Error: ${error.message}`;
            if (error.message && error.message.includes('subtitles') || error.message && error.message.includes('caption')) {
                errorMsg += '\n\nPossible issues:\n1. VTT file format might be incorrect\n2. Try a simpler VTT file\n3. Make sure timestamps are correct';
            } else if (error.message && error.message.includes('mov_text') || error.message && error.message.includes('codec')) {
                errorMsg += '\n\nSubtitle codec issue. Trying alternative method...';
            } else {
                errorMsg += '\n\nPlease try again with a different video or check console for details.';
            }
            alert(errorMsg);
            
            // Reset UI
            btnText.textContent = 'Embed Captions in Video';
            btnLoader.classList.add('hidden');
            processBtn.disabled = false;
            progressContainer.classList.add('hidden');
            timeEstimate.textContent = 'Processing failed';
        }
    }
    
    function resetApp() {
        // Reset everything
        videoInput.value = '';
        vttInput.value = '';
        vttTextarea.value = '';
        videoFile = null;
        vttContent = null;
        videoPreview.classList.add('hidden');
        videoPreview.src = '';
        videoInfo.innerHTML = '';
        vttInfo.innerHTML = '';
        resultDiv.classList.add('hidden');
        progressContainer.classList.add('hidden');
        outputVideo.innerHTML = '';
        outputVideo.src = '';
        downloadLink.href = '#';
        processBtn.disabled = true;
        btnText.textContent = 'Embed Captions in Video';
        
        updateStatus('Ready to process another video!', 'ready');
        
        // Scroll to top
        document.querySelector('.container').scrollIntoView({ behavior: 'smooth' });
    }
}

// Initialize the application when the script loads
initializeApp();