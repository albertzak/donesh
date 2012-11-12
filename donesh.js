var net = require('net');
var fs = require("fs");  

var port = process.env.PORT || 8888;

/*
 * Callback method executed when a new TCP socket is opened.
 */
var newSocket = function(socket) {

	socket.write('\n\nHi, Welcome to done.sh!\n\n');
	socket.write('What\'s your handle? > ');
	socket.user = "";

	// Callback Handlers
	socket.on('data', function(data) {
		receiveData(socket, data);
	})
	socket.on('end', function() {
		closeSocket(socket);
	})
	socket.on('interrupt', function() {
		closeSocket(socket);
	})

}

var receiveData = function(socket, data) {
	var showPrompt = function() {
		setTimeout(function() {
			socket.write("\n(L)ist, (Q)uit, (Do #), or start typing to add a new item:\n > ");	
		}, 180);
		
		return;
	}

	data = data.toString().replace(/(\r\n|\n|\r)/gm,""); // strip newline, cr
	console.log(data);
	if (data.match(/^\s*$/gm)) return;
	if (socket.user === '') {
		socket.user = data; 
		socket.write("\nHi " + socket.user + "!\n");
		showList(socket.user, function(cb) {
			socket.write(cb);
		});
		showPrompt();
		return;
	}
	if (data.toUpperCase() === 'Q' || data.toUpperCase() === 'EXIT' || data.toUpperCase() === 'QUIT') {
		closeSocket(socket);
		return;
	} else if (data.toUpperCase() === 'L' || data.toUpperCase() === 'LS') {
		showList(socket.user, function(cb) {
			socket.write(cb);
		});
		showPrompt();
		return;
	} else if (data.match(/Do [0-9]+/ig)) {
		doItem(socket.user, data, function(cb) {
			socket.write(cb);
		});
		showPrompt();
		return;
	} else {
		addNewItem(socket.user, data, function(newItem) {
			socket.write("\nSaved '" + newItem + "'\n");
		});
		showPrompt();
		return;
	}
}



var closeSocket = function(socket) {
	socket.end('Goodbye!\n');
}

var addNewItem = function(user, item, cb) {
  	fs.appendFile("db/" + user + ".txt", item + "\n", function (err) {
 		if (err) cb(err);
 		cb(item);
	});
}

var doItem = function(user, itemID, cb) {
	var file = "db/" + user + ".txt";
	if (fs.existsSync(file)) fs.readFile(file, function(err, oldFile) {
    	if(err) cb(err);
    	var oldListArray = oldFile.toString().split("\n");
    	var newFile = "";
    	indexToDelete = parseInt(itemID.substr(2));
    	if (((indexToDelete) > (oldListArray.length-1)) || (indexToDelete<=0)) return;
    	for(i=0; i<oldListArray.length; i++) {
        	if ((i !== indexToDelete-1) && (oldListArray[i] !== '')) 
        		newFile += oldListArray[i] + "\n";

        		console.log("DO: itoD-1: " + indexToDelete-1 + " Iteration " + i + " of <" + oldListArray.length + ". oldListArray[i]=" + oldListArray[i] + " newFile=:" + newFile);
        		
    	}
    	fs.writeFile(file, newFile, function(err) {
    		if(err) cb(err); else
    		cb("Good job! You crossed off '" + oldListArray[indexToDelete-1] + "'\n");
    	})
	}); else { 
		cb("User not found.");
	}
}

var showList = function(user, cb) {
	var file = "db/" + user + ".txt";
	if (fs.existsSync(file)) fs.readFile(file, function(err, data) {
    	if(err) cb(err);
    	var listArray = data.toString().split("\n");
    	var formattedList = "";
    	for(i=1; i<listArray.length; i++) {
        	formattedList += parseInt(i) + ". " + listArray[i-1] + "\n";
    	}
    	if ((i-1)==0) {
    		cb("\nYour to-do list is empty.\n");
    	} else {
    		cb("\nThere are " + parseInt(i-1) + " items in your to-do list:\n" + formattedList);
    	}
	}); else { 
		cb("\nYour to-do list is empty.\n");
	}
}

var server = net.createServer(newSocket).listen(port);
