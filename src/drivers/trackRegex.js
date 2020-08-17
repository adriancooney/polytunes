function removeFeatFromName(name) {
	return name.replace(/ \(feat\.[\s\S]*\)/gi, "").trim();
}

function removeAndFromArtist(artist) {
	return artist.replace(/ (& [\s\S]*)/gi, "").trim();
}

module.exports = {
	removeFeatFromName,
	removeAndFromArtist
}