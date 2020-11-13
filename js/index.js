//
// Generates white noise and a preview spectrogram
// 
// Based on demonstration scripts provided by MDN:
//    https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
//    https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createBufferSource
//
// Filter coefficients generated with:
//    http://t-filter.engineerjs.com/


//
// Settings
//

const SECONDS_TO_MS = 1000

const settings = {
    segment_duration_seconds: 1.5,
    segment_transition_ms: 10,
    num_channels: 2,
    volume_range: 10,
    filter_options: {
        lowpass_40db: [
            0.06937509032995388,
            0.2550350566225787,
            0.3722292761889041,
            0.2550350566225787,
            0.06937509032995388
        ],
        unity: [1]
    },
    spectrogram: {
        width: 500,
        height: 300,
        background_color: "rgba(0, 0, 0)",
        bar_color: "rgb(0, 128, 0)",
        fft_size: 128
    }
}

const state = {
    playing_audio: false,
    audio_context: undefined,
    analyzer: undefined,
    filter: undefined,
    filter_coefficients: settings.filter_options.lowpass_40db,
    gain: 1,
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
    audio_source.connect(state.filter)
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

const init_spectrogram = (state, ctx) => {
    state.analyzer = state.audio_context.createAnalyser()
    state.analyzer.connect(state.audio_context.destination)
    state.analyzer.fftSize = settings.spectrogram.fft_size

    const buffer_length = state.analyzer.frequencyBinCount
    const fft_frame = new Uint8Array(buffer_length)
    const bar_width = settings.spectrogram.width / buffer_length - 1
    ctx.clearRect(0, 0, settings.spectrogram.width, settings.spectrogram.height)

    const draw = _ => {
        requestAnimationFrame(draw)
        state.analyzer.getByteFrequencyData(fft_frame)
        ctx.fillStyle = settings.spectrogram.background_color
        ctx.fillRect(0, 0, settings.spectrogram.width, settings.spectrogram.height)
        for(let i = 0; i < buffer_length; i++) {
            // Normalize against max buffer value (256) and the canvas height.
            let bar_height = settings.spectrogram.height*fft_frame[i]/256
            ctx.fillStyle = settings.spectrogram.bar_color
            ctx.fillRect(i*(bar_width+1), settings.spectrogram.height-bar_height, bar_width, bar_height)
        }
    }
    draw()
}

//
// Filter Generation
//

const refresh_filter_options = (settings, target) => {
    Object.keys(settings.filter_options).forEach((option) => {
        console.log(`Found filter: ${option}`)
        target[target.length] = new Option(option, option)
    })
}

const init_filter = (state, settings, target) => {
    refresh_filter_options(settings, target)
    state.filter = state.audio_context.createIIRFilter(state.filter_coefficients, [1])
    state.filter.connect(state.analyzer)
}


//
// UI Events
//

const update_filter = (target) => {
    console.log(target.value)
    state.filter = state.audio_context.createIIRFilter(settings.filter_options[target.value], [1])
    state.filter.connect(state.analyzer)
}

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
    init_filter(state, settings, document.getElementById("filter"))
    update_volume(document.getElementById("gain"))
}

setTimeout(_=>init(state), 0)
