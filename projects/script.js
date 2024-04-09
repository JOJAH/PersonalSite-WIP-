d3.json('output.json').then(function(networkData){

    // GATHERING INFORMATION FOR EASED FUTURE USE WITH DATA FILTERS
    const connectionCountLevel = networkData.connectionCountLevel;

    const packetsSentLevel = networkData.packetsSentLevel;
    const packetsRecievedLevel = networkData.packetsRecievedLevel;
    const packetsTotalLevel = networkData.totalPacketLevel;

    //SELETING SVG IN HTML TO CREATE THE TOPOLOGY WITHIN
    const svg = d3.select('#networkTopology');

    const width = svg.node().getBoundingClientRect().width;
    const height = svg.node().getBoundingClientRect().height;

    //CREATING CONNECTION LINES these are done first so the node circles overlap them
    const connections = svg.selectAll('line')
        .data(networkData.connections)
        .enter()
        .append('line')
        .attr('class','line')
        //gives the connection lines the source/destination addresses, protocol, connection count and works out its connections level which affects width length in updateLineThickness()
        .attr('sourceIp', d=>d.sourceIp)
        .attr('destinationIp', d=>d.destinationIp)
        .attr('sourceMac', d=>d.sourceMac)
        .attr('destinationMac', d=>d.destinationMac)
        .attr('id', d=>d.protocol)
        .attr('count', d=>d.count)
        .attr('ConnectionCountLevel', d=> {
            if (d.count <= connectionCountLevel){
                return 1
            } else if (d.count <= connectionCountLevel*2){
                return 3
            } else if (d.count <= connectionCountLevel*3){
                return 6
            } else if (d.count <= connectionCountLevel*4){
                return 9
            } else if (d.count <= connectionCountLevel*5){
                return 12
            }
        })
        // GIVES ON CLICK TO OPEN RIGHT SIDEBAR AND FEEDS RELEVANT DATA 
        .on('click', function(d){
            openRightSidebar('Connection', {protocol : d3.select(this).attr('id'), count : d3.select(this).attr('count'), sourceIp : d3.select(this).attr('sourceIp'), sourceMac : d3.select(this).attr('sourceMac'), destinationIp : d3.select(this).attr('destinationIp'), destinationMac : d3.select(this).attr('destinationMac')});
        });
        
    // CREATES A CIRCLE ELEMENT FOR EVERY DEVICE IN OUTPUT.JSON NODE DICT
    const nodes = svg.selectAll('circle')
        .data(networkData.nodes)
        .enter()
        .append('circle')
        .attr('fill','#0000ff')
        .attr('r',10)
        .attr('nodeNumber', d=>d.nodeNumber)
        //GIVES CIRCLES RELEVANT DATA TO INFORM DATA FILTERS
        .attr('ip', d=> d.ip)
        .attr('mac', d=> d.mac)
        .attr('packetsSent',d=> d.sent)
        .attr('packetsSentLevel', d=> packetLevel(d.sent, packetsSentLevel)) 
        .attr('packetsRecieved', d=> d.recieved)
        .attr('packetsRecievedLevel', d=> packetLevel(d.recieved, packetsRecievedLevel))
        .attr('packetsTotal', d=> d.packetTotal)
        .attr('packetsTotalLevel', d=> packetLevel(d.packetTotal, packetsTotalLevel))
        // GIVES ON CLICK TO OPEN RIGHT SIDEBAR AND FEEDS RELEVANT DATA 
        .on('click', function(d){
            openRightSidebar('Device', {ip : d3.select(this).attr('ip'), mac : d3.select(this).attr('mac'), sent: d3.select(this).attr('packetsSent'), recieved: d3.select(this).attr('packetsRecieved'), colour: d3.select(this).attr('fill')})
        });
        
    //CREATE THE NODE LABELS  
    const labels = svg.selectAll('text')
        .data(networkData.nodes)
        .enter()
        .append('text')
        .text(d=>d.mac) //GIVES THE MAC ADDRESS AS BASE LABEL 
        //GIVES LABELS DATA TO INFROM DATA FILTERS
        .attr('ip', d=> d.ip)
        .attr('mac', d=> d.mac)    
        .style('pointer-events', 'none'); //MAKES LABEL CLICK THROUGHABLE, STOPS THEM BLOCKING THE LINES AND CIRCLES    
        
//START SIMULATION WHICH APPLIES VISULISATION PHYSICAL FORCES     
const simulation = d3.forceSimulation()
    .nodes(networkData.nodes)
    .force('center', d3.forceCenter(width/2,height/2))// MOVES NODES TOWARDS THE CENTER 
    .force('link', d3.forceLink(networkData.connections).id(d=>d.nodeNumber).distance(200)) // LINKS CONNECTION LINE TO NODE CIRCLE 
    .force('charge', d3.forceManyBody().strength(-500))// REPRELS NODES FROM ONE ANOTHER
    .force("collide", d3.forceCollide().radius(9)) //PREVENTS CIRCLES FROM OVERLAPPING
    // KEEPS THE NODES WITHIN THE WINDOW, based on this: https://observablehq.com/@ben-tanen/a-tutorial-to-using-d3-force-from-someone-who-just-learned-ho#xy_sect
    .force("x", d3.forceX(width / 2).strength(0.1)) 
    .force("y", d3.forceY(height / 2).strength(0.1))
    //UPDATES NODES, CONNECTIONS AND LABELS POSTIONS 
    .on('tick', ()=>{

        nodes
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
            
        connections //UPDATES START(x1,y2) OF LINE AT CONNECTION SOURCE DEVICE POSITION, END(x2,y2) AT CONNECTION DESTINATION DEVICE 
            .attr('x1', d=> d.source.x)
            .attr('y1', d=> d.source.y)
            .attr('x2', d=> d.target.x)
            .attr('y2', d=> d.target.y);

        labels  //UPDATES LABELS POSTION BASED ON DEVICE LOCATION, IF IN TOP HALF OF SCREEN RAISES TEXT 1em ABOVE CIRCLE, IF IN BOTTOM HALF PLACES IT 1em BELOW CIRCLE
            .attr('x', d=> d.x)
            .attr('y', d=> d.y)
            .attr('dy', d=> d.y > height /2 ? '1em':'-1em');
});

//NODE DRAGGING
//This is where I found some drag mechanics for the nodes https://d3-graph-gallery.com/graph/circularpacking_drag.html
nodes.call(d3.drag()
.on('start', dragStarted)
.on('drag', dragged)
.on('end',dragEnded));

function dragStarted(event, d){
    if(!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}
function dragged(event, d){
    d.fx = event.x;
    d.fy = event.y;
}
function dragEnded(event, d){
    if(!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}
});


//CREATE UNIQUE PROTOCOL LIST IN SIDEBAR

fetch('output.json').then(function(responce){
    return responce.json();
})
    .then(function(networkData){
    const protocols = networkData.uniqueProtocols;
    const sidebarProtocolFilter = document.getElementById('sidebarProtocolFilter');
    sidebarProtocolFilter.innerHTML = '<ul style= "list-style: none;">' + protocols.map(protocol => `<li id="${protocol}" onclick="selectProtocol('${protocol}')"> ${protocol}</li>`).join('')+'</ul>';
})

let selectedProtocol = null;
let selectedColour = '#000000';
let selectedProtocolText = null;

//FUNCTIONS

//LEFT SIDE BAR FUNCTIONS

function openLeftNav(){
    document.getElementById('leftSidebar').style.width = '250px';
    document.getElementById('main').style.marginLeft = '250px';
    document.getElementById('openbtn').style.visibility = 'hidden';
}

function closeLeftNav(){
    document.getElementById('leftSidebar').style.width = '0';
    document.getElementById('main').style.marginLeft = '0';
    document.getElementById('openbtn').style.visibility = 'visible';
}

//PROTOCOL FUNCTIONS
function selectProtocol(protocol){
    selectedProtocol = protocol;
    changeLineColour();
}

function changeLineColour(){
    const colourPicker = document.getElementById('colourPicker');
    selectedColour = colourPicker.value;

    if(selectedProtocol){
        d3.selectAll('#'+selectedProtocol).style('stroke', selectedColour);
        document.getElementById(selectedProtocol).style.color = selectedColour
    }

    selectedProtocol = null
}


//CONNECTION ACTIVETY COUNT FUNCTIONS
function updateLineThickness(){
    const connectionThicknessCheckBox = document.getElementById('connectionsThicknessCheckbox');
    const connectionThicknessCheckBoxchecked = connectionThicknessCheckBox.checked
    
    if (connectionThicknessCheckBoxchecked){
        d3.selectAll('line').style('stroke-width', function(){
            return d3.select(this).attr('ConnectionCountLevel')
        } )
    } else{
        d3.selectAll('line').style('stroke-width',2);
    }
}

//DEVICE ACTIVETY PACKET FUNCTIONS
function updateNodeSizeSent(){
    const sentCheckBox = document.getElementById('sentPacketCheckbox');
    const sentCheckBoxChecked = sentCheckBox.checked;

    if(sentCheckBoxChecked){
        if(document.getElementById('recievedPacketCheckbox').checked){
            document.getElementById('recievedPacketCheckbox').click();
        }
        if(document.getElementById('totalPacketCheckbox').checked){
            document.getElementById('totalPacketCheckbox').click(); 
        }
        d3.selectAll('circle').style('r', function(){
            return (parseInt(d3.select(this).attr(('packetsSentLevel')))*2).toString();
        })
    }else{
        d3.selectAll('circle').style('r',10);
    }
}

function updateNodeSizeRecieved(){
    const recievedCheckBox = document.getElementById('recievedPacketCheckbox');
    const recievedCheckBoxChecked = recievedCheckBox.checked;
    
    if(recievedCheckBoxChecked){
        if(document.getElementById('sentPacketCheckbox').checked){
            document.getElementById('sentPacketCheckbox').click(); 
        }
        if(document.getElementById('totalPacketCheckbox').checked){
            document.getElementById('totalPacketCheckbox').click(); 
        }
        d3.selectAll('circle').style('r', function(){
            return (parseInt(d3.select(this).attr(('packetsRecievedLevel'))) *2).toString();
        })
    }else{
        d3.selectAll('circle').style('r',10);
    }
}

function updateNodeSizeTotal(){
    const totalCheckBox = document.getElementById('totalPacketCheckbox');
    const totalCheckBoxChecked = totalCheckBox.checked;

    if(totalCheckBoxChecked){
        if(document.getElementById('sentPacketCheckbox').checked){
            document.getElementById('sentPacketCheckbox').click(); 
        }
        if(document.getElementById('recievedPacketCheckbox').checked){
            document.getElementById('recievedPacketCheckbox').click();
        }
        d3.selectAll('circle').style('r', function(){
            return (parseInt(d3.select(this).attr(('packetsTotalLevel'))) *2).toString();
        })
    }else{
        d3.selectAll('circle').style('r',10);
    }
}

//USED TO CALCULATE NODES packetsSentLevel packetsRecievedLevel packetsTotalLevel
function packetLevel(count,level){
    if (count <= level){
        return 1
    } else if (count <= level*2){
        return 2
    } else if (count <= level*3){
        return 3
    } else if (count <= level*4){
        return 4
    } else if (count <= level*5){
        return 5
    } else if (count <= level*6){
        return 6
    } else if (count <= level*7){
        return 7
    } else if (count <= level*8){
        return 8
    } else if (count <= level*9){
        return 9
    } else if (count <= level*10){
        return 10
    } else if (count <= level*11){
        return 11
    } else if (count <= level*12){
        return 12
    } else if (count <= level*13){
        return 13
    } else if (count <= level*14){
        return 14
    } else if (count <= level*15){
        return 15
    } else if (count <= level*16){
        return 16
    } else if (count <= level*17){
        return 17
    } else if (count <= level*18){
        return 18
    } else if (count <= level*19){
        return 19
    } else if (count <= level*20){
        return 20
    }
}

//LABEL DATAFILTER FUNCTIONS
function updateNodeNameMac(){
    const macNameCheckbox = document.getElementById('macCheckBox');
    const macNameCheckboxChecked = macNameCheckbox.checked;

    if(macNameCheckboxChecked){
        macNameCheckbox.disabled = true
        document.getElementById('noneCheckBox').disabled = false
        document.getElementById('ipCheckBox').disabled = false

        if(document.getElementById('noneCheckBox').checked){
            document.getElementById('noneCheckBox').click();
        } else if (document.getElementById('ipCheckBox').checked) {
            document.getElementById('ipCheckBox').click();
        }

        d3.selectAll('text').text(function(){
            return d3.select(this).attr('mac')
        });
    } 
}

function updateNodeNameIp(){
    const ipNameCheckbox = document.getElementById('ipCheckBox');
    const ipNameCheckboxChecked = ipNameCheckbox.checked;

    if(ipNameCheckboxChecked){
        ipNameCheckbox.disabled = true
        document.getElementById('macCheckBox').disabled = false
        document.getElementById('noneCheckBox').disabled = false

        if(document.getElementById('noneCheckBox').checked){
            document.getElementById('noneCheckBox').click();
        } else if (document.getElementById('macCheckBox').checked) {
            document.getElementById('macCheckBox').click();
        }

        d3.selectAll('text').text(function(){
            return d3.select(this).attr('ip')
        });
    }
}

function updateNodeNameNone(){
    const noneNameCheckbox = document.getElementById('noneCheckBox');
    const noneNameCheckboxChecked = noneNameCheckbox.checked;

    if(noneNameCheckboxChecked){
        noneNameCheckbox.disabled = true
        document.getElementById('macCheckBox').disabled = false
        document.getElementById('ipCheckBox').disabled = false

        if(document.getElementById('ipCheckBox').checked){
            document.getElementById('ipCheckBox').click();
        } else if (document.getElementById('macCheckBox').checked) {
            document.getElementById('macCheckBox').click();
        }
        
        d3.selectAll('text').text('');
    }
}

//RIGHT SIDE BAR 
//https://observablehq.com/@d3/click-vs-drag Click vs Drag, also make node bigger

function openRightSidebar(title, content){
    
    const rightSidebarTitle = document.getElementById('rightSidebarTitle');
    const rightSidebarContent = document.getElementById('rightSidebarContent');

    rightSidebarContent.innerHTML= '';

    document.getElementById('rightSidebar').style.width = '250px';
    document.getElementById('main').style.marginRight = '250px';

    rightSidebarTitle.textContent = title

    if(title == 'Device'){
        //make device colour picker visible if connections opened previously
        document.getElementById('deviceColourPickerDiv').style.display = '';
        
        //give the colour picker the mac value so it can call the circle with that mac value in changeDeviceColour()
        document.getElementById('deviceColourPicker').setAttribute('mac', content.mac)

        //set the device colour picker to the colour of the circle clicked 
        document.getElementById('deviceColourPicker').value = content.colour;

        ipLine = document.createElement('p');
        ipLine.innerHTML = "This device's IP address is: <strong>"+ content.ip + '</strong>';
        rightSidebarContent.appendChild(ipLine) 

        macLine = document.createElement('p');
        
        macLine.innerHTML = "This device's MAC address is: <strong>"+ content.mac + '</strong>';
        rightSidebarContent.appendChild(macLine) 

        sentLine =document.createElement('p');
        sentLine.innerHTML = 'This device sent <strong>' + content.sent + '</strong> packets';
        rightSidebarContent.appendChild(sentLine)

        recievedLine = document.createElement('p');
        recievedLine.innerHTML = 'This device recieved <strong>' + content.recieved + '</strong> packets';
        rightSidebarContent.appendChild(recievedLine);

    }
    if(title == 'Connection'){
        console.log(content)
        //remove device colour selector for connection side bar
        document.getElementById('deviceColourPickerDiv').style.display = 'none';

        protocolLine = document.createElement('p');
        protocolLine.innerHTML = 'This connection was sent in the protocol <strong>' + content.protocol + '</strong>';
        rightSidebarContent.appendChild(protocolLine);

        countLine = document.createElement('p');
        countLine.innerHTML = 'This connection occured <strong>' + content.count + '</strong> times';
        rightSidebarContent.appendChild(countLine);

        ipConnectionLine = document.createElement('p');
        ipConnectionLine.innerHTML = 'This connection is from <strong>' + content.sourceIp + '/' + content.sourceMac + '</strong> to <strong>' + content.destinationIp + '/' + content.destinationMac + '</strong>';
        rightSidebarContent.appendChild(ipConnectionLine);
    }
}

function changeDeviceColour(){
        deviceColourPicker = document.getElementById('deviceColourPicker');
        const selectedColour = deviceColourPicker.value;
        d3.select(`circle[mac='${deviceColourPicker.getAttribute('mac')}']`).attr('fill', selectedColour);
}

function closeRightSidebar(){
    const rightSidebar = document.getElementById('rightSidebar');
    rightSidebar.style.width = '0';
    document.getElementById('main').style.marginRight = '0';
}