const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let sound_data = null;
let curr_sound = {
    data: null,
    sfx_promise: null,
    sfx: null,
    img_promise: null,
    img: null,
};

const sound_data_promise = fetch("sounds.json")
    .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    })
    .then(data => {
        sound_data = data;
    });

let successSoundEffects = []
let failureSoundEffects = []

startup();

async function startup() {
    await pickRandomSfx();

    fetchSuccessSoundEffects()
        .then(data => successSoundEffects = data);

    fetchFailureSoundEffects()
        .then(data => failureSoundEffects = data);
}

async function pickRandomSfx() {
    removeLastSfx()

    await sound_data_promise;

    const idx = Math.floor(Math.random() * sound_data.length);
    curr_sound.data = sound_data[idx];

    curr_sound.sfx_promise = fetchSfx(curr_sound.data.audio_file);
    curr_sound.img_promise = fetchImg(curr_sound.data.image)

    await curr_sound.sfx_promise;
    await curr_sound.img_promise;
}

async function fetchSfx(filename) {
    const path = `audio_files/${filename}`;

    const response = await fetch(path);
    if (!response.ok) throw new Error(`Audio fetch failed: HTTP ${response.status}`);

    const blob = await response.blob();
    curr_sound.sfx = URL.createObjectURL(blob);
}
async function fetchImg(filename) {
    const path = `pictures/${filename}`;

    const response = await fetch(path);
    if (!response.ok) throw new Error(`Image fetch failed: HTTP ${response.status}`);

    const blob = await response.blob();
    curr_sound.img = URL.createObjectURL(blob);
}

async function playSfx() {
    await curr_sound.sfx_promise;

    if (!curr_sound.sfx) throw new Error("No audio file is ready");

    const audio = new Audio(curr_sound.sfx);

    await audio.play();
}
async function removeLastSfx() {
    if (curr_sound.sfx != null) {
        URL.revokeObjectURL(curr_sound.sfx)
    }
}


let answer_visible = false;

function toggleAnswer() {
    if (!answer_visible) {
        showAnswer();
    } else {
        hideAnswer();
    }
}
function showAnswer() {
    answer_visible = true

    const resultImg = document.getElementById("result-img");
    resultImg.setAttribute("src", curr_sound.img);
    resultImg.classList.remove("hide")

    const resultName = document.getElementById("result-name");
    resultName.innerText = curr_sound.data.formatted_name;

    const toggleBtn = document.getElementById("answer-toggle-button");
    toggleBtn.innerText = "Hide Answer";
}
function hideAnswer() {
    answer_visible = false;

    const resultImg = document.getElementById("result-img");
    resultImg.classList.add("hide")

    const result_name = document.getElementById("result-name");
    result_name.innerText = "";

    const toggleBtn = document.getElementById("answer-toggle-button");
    toggleBtn.innerText = "Show Answer";
}

async function nextQuestion() {
    await pickRandomSfx()
    hideAnswer()
    await delay(750)
    await playSfx()
}


async function fetchSuccessSoundEffects() {
    const response = await fetch("success_sound_effects/success.json");
    if (!response.ok) {
        throw new Error(`Could not load success.json: ${response.status}`);
    }
    const json = await response.json();

    let soundEffects = []

    for (sfx of json) {
        const path = "success_sound_effects/" + sfx.path;
        const audioResponse = await fetch(path);
        if (!audioResponse.ok) {
            throw new Error(`Could not load ${path}: ${audioResponse.status}`);
        }

        const blob = await audioResponse.blob();

        soundEffects.push({
            sfx: new Audio(URL.createObjectURL(blob)),
            weight: sfx.weight,
        });
    }

    return soundEffects
}
function playSuccessSfx() {
    let picked = randomWeighted(successSoundEffects)
    playAudioWithVariedPitch(picked.sfx)
}

async function fetchFailureSoundEffects() {
    const response = await fetch("failure_sound_effects/failure.json");
    if (!response.ok) {
        throw new Error(`Could not load failure.json: ${response.status}`);
    }
    const json = await response.json();

    let soundEffects = []

    for (sfx of json) {
        const path = "failure_sound_effects/" + sfx.path;
        const audioResponse = await fetch(path);
        if (!audioResponse.ok) {
            throw new Error(`Could not load ${path}: ${audioResponse.status}`);
        }

        const blob = await audioResponse.blob();

        soundEffects.push({
            sfx: new Audio(URL.createObjectURL(blob)),
            weight: sfx.weight,
        });
    }

    return soundEffects
}
function playFailureSfx() {
    let picked = randomWeighted(failureSoundEffects)
    playAudioWithVariedPitch(picked.sfx)
}


// Helpers <:

function randfRange(min, max) {
    return (Math.random() * (max - min)) + min
}

function randomWeighted(options) {
    let totalWeight = 0

    for (opt of options) {
        totalWeight += opt.weight
    }

    let chosenWeight = randfRange(0, totalWeight)

    let acc = 0.0;
    for (opt of options) {
        acc += opt.weight

        if (acc >= chosenWeight) {
            return opt
        }
    }
}

async function playAudioWithVariedPitch(audio) {
    let copy = new Audio(audio.src);
    copy.playbackRate = randfRange(0.9, 1.75)
    copy.currentTime = 0;
    await copy.play();
}

async function testThatAllSoundsExist() {
    await sound_data_promise

    for (const sound of sound_data) {
        const sfx_path = `audio_files/${sound.audio_file}`;
        const sfx_response = await fetch(sfx_path);
        if (!sfx_response.ok) {
            console.error(`Failed to load SFX for ${sound.formatted_name}`)
        }

        const image_path = `pictures/${sound.image}`;
        const image_response = await fetch(image_path);
        if (!image_response.ok) {
            console.error(`failed to load image for ${sound.formatted_name}`)
        }
    }
}
