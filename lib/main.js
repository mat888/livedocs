class Livedocs_Ui {
        constructor(app, mod, container="") {
                this.app = app;
                this.mod = mod;
        }
        attachEvents() {
                const button = document.getElementById("sendButton");
                button.onclick = (e) => {
                        console.log("sendButton clicked");
			let recipient = document.getElementById("recipient").value;
			let msg_data  = document.getElementById("msg-data").value;
                        this.mod.sendTx(String(recipient), String(msg_data));
                }
		const reqButton = document.getElementById("sendReqButton");
		reqButton.onclick = (e) => {
			console.log("reqButton clicked");
			let recipient = document.getElementById("peer-recipient").value
			let msg = document.getElementById("peer-msg-data").value
			this.mod.sendRelayMessage(recipient, data=msg);
		}
		const exchangeButton = document.getElementById("keyExchange_button");
		exchangeButton.onclick = (e) => {
			let pubKey = document.getElementById("exchangePubKey").value;
			this.mod.keyExchange(pubKey);
		}
		const encMsgButton = document.getElementById("encMsg_button");
		encMsgButton.onclick = (e) => {
			let pubKey = document.getElementById("encMsgPubKey").value;
			this.mod.encryptedMessage(pubKey);
		}
		/*
		const encDataButton = document.getElementById("encData_button");
		encDataButton.onclick = (e) => {
			let pubKey = document.getElementById("encPeerPubKey").value;
			this.mod.encryptedPeerMessage(pubKey);
		}
		*/

        }
	insertDOM(div, str) {
		document.getElementById(div).innerHTML = str;
	}

}

module.exports = Livedocs_Ui;

