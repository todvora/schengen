window.addEventListener("load", (event) => {
  fetch('schengen.csv?v=' + Math.random())
    .then((response) => response.text())
    .then((data) => parseCSV(data))
    .then((data) => convertData(data))
    .then((data) => renderCsv(data))
    .then((data) => drawChart(data));
});

const schengenCountries = [
  "Austria",
  "Belgium",
  "Croatia",
  "Czechia",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Iceland",
  "Italy",
  "Latvia",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Norway",
  "Poland",
  "Portugal",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
  "Switzerland"
];

function convertData(data) {
  return data.slice(1).reverse()
            .map(item => parseItem(item));
}

function renderCsv(entries) {
        //console.log(entries);

        const minDate = moment.min(entries.map(d => d.from))
        const maxDate = moment.max(entries.map(d => d.till))

        //console.log('First date', minDate);
        //console.log('Last date', maxDate);

        const intervalDays = maxDate.diff(minDate, 'days');

        var intervalID;
        var currentDate = minDate;
        var oldCountriesCount = 0;

        function showTime() {
            currentDate = currentDate.add(1, 'day');

            const countriesCount = highlightMatchingCountries(currentDate, entries);
            var changed = oldCountriesCount != countriesCount;
            oldCountriesCount = countriesCount;

            if(!currentDate.isSameOrAfter(maxDate)) {
                if(changed) {
                    setTimeout(showTime, 100);
                } else {
                    setTimeout(showTime(10));
                }
            } else {
                clearTimeout(intervalID);
            }
        }
        setTimeout(() => {
            intervalID = setTimeout(showTime, 100);
        }, 3000);

        return entries;

}

function highlightMatchingCountries(currentDate, entries) {

    document.getElementById("currentDate").innerHTML = currentDate.format("DD.MM.YYYY");

    const matching = entries.filter(entry => currentDate.isSameOrAfter(entry.from) && currentDate.isSameOrBefore(entry.till));
    const countries = matching.map(m => m.country);

    const map = document.getElementById('map');
    const children = map.children;
    for (var i = 0; i < children.length; i++) {
      const country = children[i];
      const countryName = country.getAttribute('name');
      if(countries.includes(countryName)) {
        country.style.fill = 'red';
      } else if(schengenCountries.includes(countryName)) {
        country.style.fill = '#e6ffe3';
      } else {
        country.style.fill = '#ececec';
      }
    }
    return countries.length;
}


function parseItem(item) {
    const obj = {};
    obj.nb = item[0];
    obj.country = item[1];
    obj.from = moment(item[2], "DD/MM/YYYY");
    obj.till = moment(item[3], "DD/MM/YYYY");
    obj.duration = item[4];
    obj.reason = item[5];

    if(!obj.from.isValid()) {
        console.log(obj);
    }

    return obj;
}


function parseCSV(str) {
    const arr = [];
    let quote = false;  // 'true' means we're inside a quoted field

    // Iterate over each character, keep track of current row and column (of the returned array)
    for (let row = 0, col = 0, c = 0; c < str.length; c++) {
        let cc = str[c], nc = str[c+1];        // Current character, next character
        arr[row] = arr[row] || [];             // Create a new row if necessary
        arr[row][col] = arr[row][col] || '';   // Create a new column (start with empty string) if necessary

        // If the current character is a quotation mark, and we're inside a
        // quoted field, and the next character is also a quotation mark,
        // add a quotation mark to the current column and skip the next character
        if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }

        // If it's just one quotation mark, begin/end quoted field
        if (cc == '"') { quote = !quote; continue; }

        // If it's a comma and we're not in a quoted field, move on to the next column
        if (cc == ',' && !quote) { ++col; continue; }

        // If it's a newline (CRLF) and we're not in a quoted field, skip the next character
        // and move on to the next row and move to column 0 of that new row
        if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }

        // If it's a newline (LF or CR) and we're not in a quoted field,
        // move on to the next row and move to column 0 of that new row
        if (cc == '\n' && !quote) { ++row; col = 0; continue; }
        if (cc == '\r' && !quote) { ++row; col = 0; continue; }

        // Otherwise, append the current character to the current column
        arr[row][col] += cc;
    }
    return arr;
}



google.charts.load('current', {'packages':['timeline']});

function drawChart(entries) {
  var container = document.getElementById('timeline-chart');

  var chart = new google.visualization.Timeline(container);

  var dataTable = new google.visualization.DataTable();
  dataTable.addColumn({ type: 'string', id: 'Country' });
  dataTable.addColumn({ type: 'string', id: 'Notification' });
  dataTable.addColumn({type: 'string', role: 'tooltip'});
  dataTable.addColumn({ type: 'date', id: 'Start' });
  dataTable.addColumn({ type: 'date', id: 'End' });

  const rows = entries.map(entry => {
    return [entry.country,entry.nb, formatTooltip(entry), entry.from.toDate(), entry.till.toDate()];
  })

  dataTable.addRows(rows);

  dataTable.sort([{column: 0}]);

  /*

  dataTable.addRows([
    ['Task 1', 'Role 1', new Date(2023, 0, 1), new Date(2023, 0, 5)],
    ['Task 2', 'Role 2', new Date(2023, 0, 3), new Date(2023, 0, 10)],
    ['Task 3', 'Role 3', new Date(2023, 0, 6), new Date(2023, 0, 15)]
  ]);

  */

  var options = {
    timeline: { colorByRowLabel: true },
    tooltip: { isHtml: true },
    hAxis: {
      format: 'dd.MM.yyyy'
    },
     backgroundColor: '#f7f7f7'
  };

  chart.draw(dataTable, options);
}

function formatTooltip(entry) {
    const duration = entry.till.diff(entry.from, 'days');
    const reason = highlightCountries(entry.reason);
    const date = `${entry.from.format("DD.MM.YYYY")} - ${entry.till.format("DD.MM.YYYY")}`;
    return `<div><h3>#${entry.nb}, ${duration} days</h3><p>${date}</p><p>${reason}</p></div>`;
}

function highlightCountries(reason) {
    var replaced = reason;
    schengenCountries.forEach(country => {replaced = replaced.replaceAll(country, `<strong>${country}</strong>`);})
    return replaced
        .replace(/ports with ferry connections/ig, '<strong>ports with ferry connections</strong>')
        .replace(/all internal borders/ig, '<strong>all internal borders</strong>')
        .replace(/land border/ig, '<strong>land border</strong>')

}