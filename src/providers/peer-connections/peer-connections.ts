/*
  Generated class for the PeerConnectionsProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/

export class PeerConnectionsProvider {

    
    senderPeer: RTCPeerConnection;
    configuration: any;
    addcall: any;
    icecall: any;
    changecall: any;

    constructor(configuration:any) {
        console.log("Constructor called");
        this.configuration = configuration;
    }
    createPeers() {
        console.log("Create peers entered");
        console.log(this.configuration);
        this.senderPeer = new RTCPeerConnection(this.configuration);
        this.senderPeer.onaddstream = (event)=> {
            this.addcall(event);
        };
        this.senderPeer.onicecandidate = (event)=> {
            this.icecall(event);
        };
        this.senderPeer.oniceconnectionstatechange = (event)=> {
            this.changecall(event);
        };
        console.log("exit createpeers");
    }
    createAnswer(sdp: any) {
        console.log("createanswer---");
        console.log("answer ",this);
        return new Promise((resolve,reject)=> {
                this.senderPeer.setRemoteDescription(sdp).then(()=> {
                this.senderPeer.createAnswer()
                .then((sdp)=>{
                    this.senderPeer.setLocalDescription(sdp);
                    resolve(sdp);
                }).catch(err=> {reject(err)});
            }).catch(err=>{reject(err)});
        });
    }
    generateSdp() {
        console.log("generate sdp peer ",this);
        return new Promise((resolve,reject)=> {
            this.senderPeer.createOffer()
            .then((sdp)=> {
                this.senderPeer.setLocalDescription(sdp);
                resolve(sdp);
            }).catch(err=> {reject(err)});
        });
    }
    addIceCandidate(candidate: any) {
        this.senderPeer.addIceCandidate(candidate);
    }
    setRemoteDesc(sdp: any) {
        this.senderPeer.setRemoteDescription(sdp).then(()=>{
            console.log("setting sdp success")
        }).catch(err=> {console.log("setting sdp error",err)});
    }
    onRemoveStream(callback: any) {
        this.senderPeer.onremovestream = callback.bind(this);
    }
}
