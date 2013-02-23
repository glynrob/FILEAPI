var typeFileSystem = PERSISTENT; //the type can be either TEMPORARY or PERSISTENT
var fs = null; // our connection variable to the filesystem

// Error message handler
function errorHandler(e) {
  var msg = '';

  switch (e.code) {
    case FileError.QUOTA_EXCEEDED_ERR:
      msg = 'Quota Exceeded';
      break;
    case FileError.NOT_FOUND_ERR:
      msg = 'Not Found';
      break;
    case FileError.SECURITY_ERR:
      msg = 'Security Error';
      break;
    case FileError.INVALID_MODIFICATION_ERR:
      msg = 'Invalid Modification Error';
      break;
    case FileError.INVALID_STATE_ERR:
      msg = 'Invalid State Error';
      break;
    default:
      msg = 'Unknown Error';
      break;
  };
  console.log('Error: ' + msg);
}

// file system is loaded
function fileSystemLoaded() {
	console.log('Opened file system: ' + fs.name);
	fileSpace(); // log file space left
	displayDirectory(); // display existing folders and files
}

// inital load of the file system
function kickUpFileSystem(){
	window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
	try{
		window.webkitStorageInfo.requestQuota(typeFileSystem, 5*1024*1024 /*5MB*/, function(grantedBytes) {
			window.requestFileSystem(typeFileSystem, grantedBytes, function(filesystem) {
				fs = filesystem;
				fileSystemLoaded();
			  }, errorHandler);
		}, function(e) {
			console.log('Error', e);
		});
	} catch( error ) {
		alert('Filesystem API is not supported on this browser\nPlease use Chrome');
	}
}

// display how much space is available in the file system
function fileSpace(){
	try {
		window.webkitStorageInfo.queryUsageAndQuota(webkitStorageInfo.typeFileSystem,
		function(used, remaining) {
		  console.log("Used quota: " + used + ", remaining quota: " + remaining);
		}, function(e) {
		  console.log('Error', e); 
		} );
	} catch( error ) {
		alert('Filesystem API is not supported on this browser\nPlease use Chrome');
	}
}

// create a new file
function createFile(fileName){
	fs.root.getFile(fileName+'.txt', {create: true, exclusive: true}, function(fileEntry) {
		displayDirectory(); // reload files and folders
	}, function(e) { // file was not created for some reason
		if (e.code == FileError.INVALID_MODIFICATION_ERR){ // alert most common reason for failure
			alert('Filename already exists');
		}
	});
}

// create a new folder
function createFolder(rootDirEntry, folders) {
  if (folders[0] == '.' || folders[0] == '') {
    folders = folders.slice(1);
  }
  rootDirEntry.getDirectory(folders[0], {create: true, exclusive: true}, function(dirEntry) {
    // Recursively add the new subfolder (if we still have another to create).
    if (folders.length) {
      createFolder(dirEntry, folders.slice(1));
    }
	displayDirectory();
  }, errorHandler);
};

// delete file
function deleteFile(fileName){
	fs.root.getFile(fileName, {create: false}, function(fileEntry) {
		fileEntry.remove(function() {
			displayDirectory();
		}, errorHandler);
	}, function(e) {
		if (e.code == FileError.INVALID_MODIFICATION_ERR){
			alert('Filename does not exists');
		}
	});
}

// delete folder
function deleteFolder(fileName){
	fs.root.getDirectory(fileName, {create: false}, function(dirEntry) {
		dirEntry.removeRecursively(function() {
			displayDirectory();
		}, errorHandler);
	}, function(e) {
		if (e.code == FileError.INVALID_MODIFICATION_ERR){
			alert('Folder does not exists');
		}
	});
}

// add content to a file
function addContent(existFileName){
	fs.root.getFile(existFileName, {}, function(fileEntry) {
		fileEntry.file(function(file) {
			var reader = new FileReader();
			reader.onloadend = function(e) {
				var sentContent=prompt("Add contents to the file "+existFileName,this.result);
				if (sentContent!=null && sentContent!=""){
					fileEntry.createWriter(function(fileWriter) {
						fileWriter.onwriteend = function(trunc) {
							fileWriter.onwriteend = null; // Avoid an infinite loop.
							var blob = new Blob([sentContent], {type: 'text/plain'});// Create a new Blob and write it to file.
							fileWriter.write(blob);
						}
						fileWriter.onerror = function(e) {
							alert('Sorry, this text could not be saved');
						};
						fileWriter.seek(fileWriter.length); // Start write position at EOF.
  						fileWriter.truncate(0); // truncate existing so all data is written over
					}, errorHandler);
				}
			};
			reader.readAsText(file);
		});
	}, function(e) {
		if (e.code == FileError.NOT_FOUND_ERR){
			alert('Filename does not exists'); // should never happen
		}
	});
}

// display all files and folders -  this actually just gets this date
function displayDirectory(){
	$('.filemanagement ul').html('');// clear existing data
	var dirReader = fs.root.createReader(); // create reader
	var entries = [];
	var readEntries = function() { // new function so you can loop on itself
		dirReader.readEntries(function(results) { // read all entries saved
			if (!results.length) {
				displayFilesAndFolders(entries.sort()); // display all entries saved
			} else {
				entries = entries.concat(toArray(results));
				readEntries();
			}
		}, errorHandler);
	}
	readEntries();
}

// actual display of all the files and folders
function displayFilesAndFolders(entries){
	if (entries.length) {
		entries.forEach(function(entry, i) {
			if(entry.isDirectory){
				$('.filemanagement ul').append('<li><a class="deleteFolder"><img src="images/icon_delete_small.png"/></a><img src="images/icon-folder.gif"><a class="existFolder">'+entry.name+'</a></li>');
				
			} else {
				$('.filemanagement ul').append('<li><a class="deleteFile"><img src="images/icon_delete_small.png"/></a><img src="images/icon-file.gif"><a class="existFile">'+entry.name+'</a></li>');
			}
		});
	}
}

// basic to array function
function toArray(list) {
  return Array.prototype.slice.call(list || [], 0);
}

/* Start running the requests */
$(document).ready(function() {
	var systemup = kickUpFileSystem();
	
	// add new file button clicked
	$('#addfile').live("click", function(){
		var sentName=prompt("Enter the file name");
		if (sentName!=null && sentName!=""){
			createFile(sentName);
		}
	});
	// file has been clicked so add new content
	$('.existFile').live("click", function(){
		var existFileName = $(this).html();
		addContent(existFileName);
	});
	// delete file
	$('.deleteFile').live("click", function(){
		var existFileName = $(this).parent().find('.existFile').html();
		var r=confirm("Are you sure you want to delete this file");
		if (r==true){
			deleteFile(existFileName);
		}
	});
	// add new folder button clicked
	$('#addfolder').live("click", function(){
		var sentName=prompt("Enter the folder name");
		if (sentName!=null && sentName!=""){
			createFolder(fs.root, sentName.split('/'));
		}
	});
	// delete folder Recursively
	$('.deleteFolder').live("click", function(){
		var existFileName = $(this).parent().find('.existFolder').html();
		var r=confirm("Are you sure you want to delete this folder");
		if (r==true){
			deleteFolder(existFileName);
		}
	});
});