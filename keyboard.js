import {startMidi, addMidi} from "../midi/midi.js";
// needs to register 'receiveFunctions's to a global midi 'object', enabling as many functions as necessary...

const mapNotes= (container, noteStart=24) =>{
    const semiTones=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    const keys=container.querySelectorAll('div');
    const octaves=Math.floor(keys.length/12);
    const whiteWidth=100 / ( octaves * 7 + 1);
    const blackWidth=(100 - whiteWidth) / ( octaves * 12 );
   // console.log(keys);
    for (let i=0; i<keys.length; i++){
        let value=semiTones[( i ) %12] ;
        let key=keys[i];
        key.dataset.name=value;
        key.dataset.midiNote=noteStart+i;
        if (value.includes("#")){
            key.className="key black";
            key.style.width=blackWidth + "%";
            key.style.left=i*blackWidth+"%";
        } else {
            key.className="key white";
            key.style.width=whiteWidth + "%";
            let octave=Math.floor(i/12);
            let index=["C","D","E","F","G","A","B"].indexOf(value);
            key.style.left= (octave*12*blackWidth+index * whiteWidth) +"%"; 
        }
    }
    container.onselectstart = function() { return false; };
    return keys;
};

function createUI(octaves, octaveStart){
    const keyboard=document.createElement("div");
    const noteStart = octaveStart ? octaveStart*12 : Math.floor((9-octaves)/2)*12;
    for (let i=0; i<octaves*12+1; i++){
        keyboard.appendChild(document.createElement("div"));
    }
    keyboard.className="keyboard";
    mapNotes(keyboard, noteStart);
    return keyboard;
};

function mouseDown(event){
    if (event.buttons & 1) {
        event.target.className+=" pressed";
        console.log("mouseDown",this, event.target.dataset.midiNote);
        this.noteOnCallback(event.target.dataset.midiNote);
    }
};

function mouseUp(event){
    if (event.target.classList.contains("pressed")){
        event.target.classList.remove("pressed");
        this.noteOffCallback(event.target.dataset.midiNote);
    }
};

const makeKeyboard = ({
    octaves = 4,
    octaveStart = null, // defaults to center keyboard in midi range at createUI(mapNotes)...
    noteOnCallback=(event)=>console.log("set noteOnCallback to receive keyboard noteOn events. " + event),
    noteOffCallback=(event)=>console.log("set noteOffCallback to receive keyboard noteOff events. " + event),
} ={}) => ({
    noteOnCallback,
    noteOffCallback,   
    UI : createUI (octaves, octaveStart),
    init(){
        this.mouseDown=mouseDown.bind(this);
        this.mouseUp=mouseUp.bind(this);
        this.UI.onmouseover= this.UI.onmousedown = this.mouseDown;
        this.UI.onmouseout = this.UI.onmouseup = this.mouseUp;
    }
});

var keyboard1= makeKeyboard({octaves:6, channelOut: 2});
var keyboard2= makeKeyboard({octaves:4, channelOut: 2});
var midiKeyboard1= addMidi({o: keyboard1 });
midiKeyboard1.init();
keyboard2.init();
document.body.appendChild(midiKeyboard1.UI);
document.body.appendChild(keyboard2.UI);