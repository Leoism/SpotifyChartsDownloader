const CSV = require('csv-string');
const fetch = require('node-fetch');
const fs = require('fs');
const { start } = require('repl');
const startDate = new Date(1482998400000);
const oneDay = 86400000;
const sevenDays = oneDay * 7;
const countries = {
    'us': 'United States',
    'gb': 'United Kingdom',
    'ad': 'Andorra',
    'ar': 'Argentina',
    'at': 'Austria',
    'au': 'Australia',
    'be': 'Belgium',
    'bg': 'Bulgaria',
    'bo': 'Bolivia',
    'br': 'Brazil',
    'ca': 'Canada',
    'ch': 'Switzerland',
    'cl': 'Chile',
    'co': 'Colombia',
    'cr': 'Costa Rica',
    'cy': 'Cyprus',
    'cz': 'Czech Republic',
    'de': 'Germany',
    'dk': 'Denmark',
    'do': 'Dominican Republic',
    'ec': 'Ecuador',
    'ee': 'Estonia',
    'es': 'Spain',
    'fi': 'Finland',
    'fr': 'France',
    'gr': 'Greece',
    'gt': 'Guatemala',
    'hk': 'Hong Kong',
    'hn': 'Honduras',
    'hu': 'Hungary',
    'id': 'Indonesia',
    'ie': 'Ireland',
    'il': 'Israel',
    'in': 'India',
    'is': 'Iceland',
    'it': 'Italy',
    'jp': 'Japan',
    'lt': 'Lithuania',
    'lu': 'Luxembourg',
    'lv': 'Latvia',
    'mx': 'Mexico',
    'my': 'Malaysia',
    'ni': 'Nicaragua',
    'nl': 'Netherlands',
    'no': 'Norway',
    'nz': 'New Zealand',
    'pa': 'Panama',
    'pe': 'Peru',
    'ph': 'Philippines',
    'pl': 'Poland',
    'pt': 'Portugal',
    'py': 'Paraguay',
    'ro': 'Romania',
    'se': 'Sweden',
    'sg': 'Singapore',
    'sk': 'Slovakia',
    'sv': 'El Salvador',
    'th': 'Thailand',
    'tr': 'Turkey',
    'tw': 'Taiwan',
    'uy': 'Uruguay',
    'vn': 'Vietnam',
    'za': 'South Africa',
    'global': 'Global',
};

function formatDate(date) {
    let d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;

    return [year, month, day].join('-');
}

function getDates() {
  const today = new Date().getTime();
  let curr = startDate.getTime();
  let dates = [];
  do {
    dates.push(curr);
    curr = curr + sevenDays;
  } while(curr < today);
  return dates;
}

function getWeekRanges() {
  const dates = getDates();
  const weeklyRanges = {};
  for (const date of dates) {
    weeklyRanges[formatDate(date)] = (getSingleWeekRange(date));
  }
  return weeklyRanges;
}

function getSingleWeekRange(date) {
  const firstDay = formatDate(date - oneDay * 6);
  const lastDay = formatDate(date + oneDay);
  return `${firstDay}--${lastDay}`;
}

/**
 * Gets the download url for a single week
 * @param {String} date - YYYY-MMM-DD 
 */
function getDownloadUrl(date, region) {
  const weeks = getWeekRanges();
  const url = `https://spotifycharts.com/regional/${region}/weekly/${weeks[date]}/download`;
  return url;
}

async function downloadRange(startingDate, endingDate, region = 'all') {
  if (new Date(endingDate) < new Date(startingDate)) {
    console.error('InvalidDateRange: Starting Date greater than Ending Date.');
    return;
  }

  let dataStr = 'Region,Date,Position,Song,Artist,Streams,URL\n';
  const isSingleWeek = startingDate === endingDate;
  const dates = Object.keys(getWeekRanges());
  if (isSingleWeek && region == 'all') {
    for (const country in countries) {
      dataStr += await downloadWeek(startingDate, country);
    }
  } else if (isSingleWeek) {
    dataStr += await downloadWeek(startingDate, region);
  } else if (region == 'all') {
    const startIdx = dates.indexOf(startingDate);
    const endIdx = dates.indexOf(endingDate);
    for (const country in countries) {
      for (let i = startIdx; i <= endIdx; i++) {
        dataStr += await downloadWeek(dates[i], country);
      }
    }
  } else {
    const startIdx = dates.indexOf(startingDate);
    const endIdx = dates.indexOf(endingDate);
    for (let i = startIdx; i <= endIdx; i++) {
        dataStr += await downloadWeek(dates[i], region);
      }
  }
  fs.writeFileSync(`spotify_data_${region}.csv`, dataStr);
}

async function downloadWeek(date, region) {
  const csv = await fetch(getDownloadUrl(date, region)).then((res) => res.text());
  const entries = CSV.parse(csv);
  entries.shift();
  entries.shift();
  let totalStreams = 0;
  for (const entry of entries) {
    entry.unshift(date);
    entry.unshift(countries[region]);
    totalStreams += parseInt(entry[5]); // streams column
  }

  return CSV.stringify(entries) + `Total Streams,${countries[region]},${date},${totalStreams}\n`;
}

console.log(downloadRange('2019-01-03', '2019-12-26', 'us'));