
const midi={  //global midi 'object', enabling as many instances as necessary...
    access: startMidi(),
    inputRecipients: [], // an array of all object instances that need to receive midi events...
    doMidiEvents (event){
        if (midi.inputRecipients.length > 0){
            console.log(midi.inputRecipient)
            midi.inputRecipients.forEach( recipient => recipient.midiListener.call(recipient, event));
        }
    },
    removeRecipient(instance){
        midi.inputRecipients=midi.inputRecipients.filter( recipient => recipient != instance);
    }
};
function startMidi(){ 
    function onMIDIFailure(msg) {
        console.log( "Failed to get MIDI access - " + msg );
    }
    function onMIDISuccess( midiAccess) {
        console.log( "MIDI ready!");
        midi.access=midiAccess;  // keep in object instance
        midi.access.inputs.forEach( function(entry){entry.onmidimessage = midi.doMidiEvents;});
    }
    navigator.requestMIDIAccess().then( onMIDISuccess, onMIDIFailure );
}
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
    keyboard.className="keyboard";
    for (let i=0; i<octaves*12+1; i++){
        keyboard.appendChild(document.createElement("div"));
    }
    mapNotes(keyboard, noteStart);
    return keyboard;
};
function mouseDown(event){
    if (event.buttons & 1) {
        event.target.className+=" pressed";
        console.log(event.target.dataset.midiNote)
        this.sendMidi([0x90, event.target.dataset.midiNote, 0x7f]);    // note on, full velocity);
    }
};
function mouseUp(event){
    if (event.target.classList.contains("pressed")){
    event.target.classList.remove("pressed");
    this.sendMidi([0x80, event.target.dataset.midiNote, 0x7f]); // note off, full velocity);
    }    
};
function keyboardMidiListener(event){
    // Utilized by 'midi' object interface (doMidiEvents method.)    
    // each keyboard instance has a 'midiListener' key that points to this function.
    const channel = (event.data[0] & 0x0f)+1;
    // lookback to correct keyboard...
    if (this.channelIn==channel || !this.channelIn){
        const midiType= event.data[0] & 0xf0;
        const keyboard=this.UI;
        const key=keyboard.querySelector(`[data-midi-note="${event.data[1]}"]`);
        if (midiType===144){ 
            key.classList.add("pressed");
        } else if (midiType===128){
            key.classList.remove("pressed");
        };
        if (this.loopback) this.sendMidi(event.data);
    }
}

const makeKeyboard = ({
    octaves = 4,
    octaveStart = null, // defaults to center keyboard in midi range at createUI(mapNotes)...
    outputPortId = null, // defaults to first available port...
    channelOut = 1,  
    channelIn = null, // not wired... currently takes input on all ports and channels.
    loopback = true, // keyboard midiIn goes into UI then loops back to "channelOut",
} ={}) => ({
    outputPortId,
    channelOut,
    channelIn,   
    loopback,
    midi: null,    
    UI : createUI (octaves, octaveStart),
    changeOutputPort(outputPortId){
        console.log("changeOutputPort")
        try {
            this.output = midi.access.outputs.get(outputPort);
            this.outputPortId = outputPort;
        }
        catch {
            const portIDs=[];
            for (let entry of midi.access.outputs){
                portIDs.push(entry[1].id);
            }
            console.error("Null or invalid outputPortId selected." +
            "Current available portIds are: \n" + portIDs +
                    "\n Selecting " + portIDs[0] + " by default.\n")
            midi.outputPortId = outputPortId;
            this.output = midi.access.outputs.get(portIDs[0]);// shouldn't have to do every time!
        }
    },
    sendMidi(event) {
        const [route, ...rest]=event;
        const outMessage = [(route & event[0] & 0xf0 )+ (this.channelOut - 1), ...rest];
        console.log("sendmidi this", this ,outMessage, event)
        try{
            this.output.send( outMessage );
        }
        catch(error){
            this.changeOutputPort();
            this.output.send( outMessage );
        }
        
    },
    midiListener: keyboardMidiListener, //does not need 'bind'!!! This function gets called by 'midi' instance on input.
    init(){
        this.mouseDown=mouseDown.bind(this);
        this.mouseUp=mouseUp.bind(this);
        midi.inputRecipients.push(this);
        
        console.log(midi)
        this.UI.onmouseover= this.UI.onmousedown = this.mouseDown;
        this.UI.onmouseout = this.UI.onmouseup = this.mouseUp;
    }
});

var keyboard1= makeKeyboard({octaves:6, channelOut: 2,});
var keyboard2= makeKeyboard({octaves:4, channelIn: 2, channelOut: 1});
keyboard1.init();
keyboard2.init();


setTimeout(()=>{
    keyboard2.changeOutputPort("ull");
    console.log("attempted change", keyboard2)
}, 300);
document.body.appendChild(keyboard1.UI);
document.body.appendChild(keyboard2.UI);
