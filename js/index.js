//
// Settings
//

const SECONDS_TO_MS = 1000

const settings = {
    segment_duration_seconds: 2,
    segment_transition_ms: -10,
    num_channels: 2,
    volume_range: 10
}

let state = {
    audio_context: undefined,
    playing_audio: false,
    gain: 1
}


//
// Audio Generation
//

const generate_white_noise_segment = (state, settings) => {
    const num_frames = state.audio_context.sampleRate * settings.segment_duration_seconds
    let audio_buffer = state.audio_context.createBuffer(settings.num_channels,
                                                        num_frames,
                                                        state.audio_context.sampleRate)
    for (let channel = 0; channel < settings.num_channels; channel++){
        let channel_buffer = audio_buffer.getChannelData(channel)
        for (let i = 0; i < num_frames; i++){
            // Normaize from 0 to 1 to -1 to 1 and apply the gain.
            channel_buffer[i] = (Math.random() * 2 - 1)*state.gain
        }
    }
    return audio_buffer
}

const play_segment = (buffer, state, settings, callback) => {
    let audio_source = state.audio_context.createBufferSource()
    audio_source.buffer = buffer
    audio_source.connect(state.analyzer)
    audio_source.start()
    setTimeout(callback, state.segment_duration_seconds*SECONDS_TO_MS-settings.segment_transition_ms)
}

const generate_audio_context = (state) => {
    const audio_context = window.AudioContext || window.webkitAudioContext
    if (!state.audio_context){
        state.audio_context = new audio_context()
    } else {
        console.log("Audio context already initialized.")
    }
}


//
// Spectrogram Generation
//

const init_spectrogram = (state, canvasCtx) => {
    WIDTH = 500
    HEIGHT = 300

    var analyser = state.audio_context.createAnalyser();
    analyser.fftSize = 256;
    var bufferLength = analyser.frequencyBinCount;
    console.log(bufferLength);
    var dataArray = new Uint8Array(bufferLength);
    var barWidth = (WIDTH / bufferLength) * 2.5;
    var barHeight;
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    function draw() {
        var x = 0;
      drawVisual = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      canvasCtx.fillStyle = 'rgb(0, 0, 0)';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
      for(var i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i]/2;
        canvasCtx.fillStyle = 'rgb(' + (barHeight+100) + ',50,50)';
        canvasCtx.fillRect(x,HEIGHT-barHeight/2,barWidth,barHeight);
        x += barWidth + 1;
      }
    };

    state.analyzer = analyser
    state.analyzer.connect(state.audio_context.destination)
    draw()
}


//
// UI Events
//

const update_volume = (target) => {
    state.gain = 2**((target.value-target.max)*settings.volume_range/target.max)
}

const resume_playing = _ => {
    const callback = _ => {
        if (state.playing_audio){
            const buffer = generate_white_noise_segment(state, settings)
            play_segment(buffer, state, settings, callback)
        }
    }

    state.playing_audio = true
    callback()
}

const stop_playing = _ => {
    state.playing_audio = false
}


//
// Initialization
//

const init = (state) => {
    generate_audio_context(state)
    init_spectrogram(state, document.getElementById("spectrum").getContext("2d"))
    update_volume(document.getElementById("gain"))
}

setTimeout(_=>init(state), 0)
