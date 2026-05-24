const ytUrl = "https://www.googleapis.com/youtube/v3/search?key=AIzaSyAcP8tlDqXnT1LWiozs4lPRB-y0xPiTLis&channelId=UCtYfQeLz_Xb2NqMly9C6fQg&part=snippet,id&order=date&maxResults=5&type=video";
fetch(ytUrl)
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
