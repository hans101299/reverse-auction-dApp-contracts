async function uploadTicketMetadata(ticket){
    var authorizationBasic = window.btoa(process.env.INFURA_KEY + ':' + process.env.INFURA_SECRET);
    var buf = Buffer.from(JSON.stringify(ticket));
    let formData = new FormData();
    formData.append("file", buf);
    var response = fetch('https://ipfs.infura.io:5001/api/v0/add', {
        method: "POST", 
        headers: new Headers({
            "Authorization": authorizationBasic
        }),
        body: formData        
    });
    return 
}

async function getTicketMetadata(cid){
    const helia = await heliaP.createHelia()
    const j = json.json(helia)
    const ticket = await j.get(cid)
    return ticket
}
