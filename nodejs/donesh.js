var net = require('net');
var fs = require('fs');

var port = 2323; // be sure to add an iptables redirect for traffic from port 23 to 2323 because listening on ports <1024 requires node to run as root. see http://stackoverflow.com/a/8321789

var newSocket = function(socket) {
	console.log("[INFO] New connection from " + socket.remoteAddress);
	socket.write('\n\nHi, Welcome to done.sh!\n\n');
	socket.write('What\'s your handle? > ');	

	socket.user = "";
	
	// Quick and dirty fix because some telnet clients seem to send random ASCII characters right after the socket is opened, so we ignore anything we receive in the first 400ms 
	socket.ready=false;
	setTimeout(function() {
			socket.ready=true;
	}, 400);

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

	if(!socket.ready) return;

	data = data.toString().replace(/(\r\n|\n|\r)/gm,""); // Strip newline / carriage return

	if (data.match(/^\s*$/gm)) return;	// ignore if we receive just whitespace
	if (!data.match(/[ -~]+/gm)) return; // only accept ASCII

	if (socket.user == "") {
		if(!data.match(/[a-zA-Z0-9_. ]+/)) return;
		socket.user = data; 
		console.log("[INFO] User " + socket.user + " connected");
		socket.write("\nHi " + socket.user + "!\n");
		showList(socket.user, function(cb) {
			socket.write(cb);
		});
		showPrompt();
		return;
	}
	// Quit
	if (data.toUpperCase() === 'Q' || data.toUpperCase() === 'EXIT' || data.toUpperCase() === 'QUIT') {
		closeSocket(socket);
		return;
	// List
	} else if (data.toUpperCase() === 'L' || data.toUpperCase() === 'LS') {
		showList(socket.user, function(cb) {
			socket.write(cb);
		});
		showPrompt();
		return;
	// Do #item
	} else if (data.match(/Do [0-9]+/ig)) {
		doItem(socket.user, data, function(cb) {
			socket.write(cb);
		});
		showPrompt();
		return;
	// Add new Item
	} else {
		addNewItem(socket.user, data, function(newItem) {
			socket.write("\nSaved '" + newItem + "'\n");
		});
		showPrompt();
		return;
	}
}

var closeSocket = function(socket) {
	socket.end('\nGoodbye!\n\n'+ motivationalQuote() +'\n\n');
	console.log("[INFO] User " + socket.user + " disconnected.");
}

var addNewItem = function(user, item, cb) {
  	fs.appendFile("db/" + user + ".txt", item + "\n", function (err) {
 		if (err) console.log("[ERROR] (User " + user + " added '" + item + "') Error: " + err);
 		console.log("[INFO] User " + user + " added '" + item + "'");
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
    	}
    	fs.writeFile(file, newFile, function(err) {
    		if(err) console.log("[ERROR] User " + user + " did '" + oldArrayList[indexToDelete-1] + "' Error: " + err); else
    		cb("Good job! You crossed off '" + oldListArray[indexToDelete-1] + "'\n");
    		console.log("[INFO] User " + user + " did '" + oldListArray[indexToDelete-1] + "'");

    	})
	}); else { 
		cb("User not found.");
	}
}

var showList = function(user, cb) {
	var file = "db/" + user + ".txt";
	if (fs.existsSync(file)) {
		fs.readFile(file, function(err, data) {
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
	    });
	} else { 
		cb("\nYour to-do list is empty.\n");
	}
}

var server = net.createServer(newSocket).listen(port);

var motivationalQuote = function() {
	return motivationalQuotes[Math.floor(Math.random()*motivationalQuotes.length)];
}

var motivationalQuotes = [
	'"Build. Measure. Learn. \n ~Eric Ries"',
	'"The most destructive thing smart people do is spend their lives waiting. Live your dreams and aspirations now.\nDon\'t wait." \n ~Dustin Curtis',
	'"Unfinished, a picture remains alive, dangerous. A finished work is a dead work, killed." \n ~Pablo Picasso ',
	'"The best way to predict the future is to invent it." \n ~Alan Kay',
	'"Focusing is about saying no." \n ~Steve Jobs',
	'"To think is easy. To act is difficult. To act as one thinks is the most difficult." \n ~Johann Wolfgang von Goethe',
	'"Make something people want." \n ~Paul Graham'
];





