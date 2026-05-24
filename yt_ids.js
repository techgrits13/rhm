const key = 'AIzaSyAcP8tlDqXnT1LWiozs4lPRB-y0xPiTLis';
const handles = ['@kayolemainworshipchannel', '@WorshipTV7', '@TrendingGospel', '@repentpreparethewaytheway', '@SamFilmsMedia'];
async function getIds() {
  for (const handle of handles) {
    const url = `https://www.googleapis.com/youtube/v3/search?key=${key}&q=${encodeURIComponent(handle)}&type=channel&part=snippet`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if(data.items && data.items.length > 0) {
         console.log(handle, '=>', data.items[0].id.channelId);
      } else {
         console.log(handle, '=> NOT FOUND');
      }
    } catch(err) {
      console.error(err);
    }
  }
}
getIds();
