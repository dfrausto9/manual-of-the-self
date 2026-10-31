/* City list: name | lat | lon | IANA time zone. Time zone history (DST etc.) comes from the browser. */
const CITIES = `San Diego, CA, USA|32.7157|-117.1611|America/Los_Angeles
Los Angeles, CA, USA|34.0522|-118.2437|America/Los_Angeles
San Francisco, CA, USA|37.7749|-122.4194|America/Los_Angeles
San Jose, CA, USA|37.3382|-121.8863|America/Los_Angeles
Sacramento, CA, USA|38.5816|-121.4944|America/Los_Angeles
Fresno, CA, USA|36.7378|-119.7871|America/Los_Angeles
Oakland, CA, USA|37.8044|-122.2712|America/Los_Angeles
Long Beach, CA, USA|33.7701|-118.1937|America/Los_Angeles
Riverside, CA, USA|33.9806|-117.3755|America/Los_Angeles
Santa Ana, CA, USA|33.7455|-117.8677|America/Los_Angeles
Bakersfield, CA, USA|35.3733|-119.0187|America/Los_Angeles
Chula Vista, CA, USA|32.6401|-117.0842|America/Los_Angeles
Escondido, CA, USA|33.1192|-117.0864|America/Los_Angeles
Oceanside, CA, USA|33.1959|-117.3795|America/Los_Angeles
Seattle, WA, USA|47.6062|-122.3321|America/Los_Angeles
Spokane, WA, USA|47.6588|-117.4260|America/Los_Angeles
Portland, OR, USA|45.5152|-122.6784|America/Los_Angeles
Las Vegas, NV, USA|36.1699|-115.1398|America/Los_Angeles
Reno, NV, USA|39.5296|-119.8138|America/Los_Angeles
Phoenix, AZ, USA|33.4484|-112.0740|America/Phoenix
Tucson, AZ, USA|32.2226|-110.9747|America/Phoenix
Albuquerque, NM, USA|35.0844|-106.6504|America/Denver
Denver, CO, USA|39.7392|-104.9903|America/Denver
Colorado Springs, CO, USA|38.8339|-104.8214|America/Denver
Salt Lake City, UT, USA|40.7608|-111.8910|America/Denver
Boise, ID, USA|43.6150|-116.2023|America/Boise
El Paso, TX, USA|31.7619|-106.4850|America/Denver
Dallas, TX, USA|32.7767|-96.7970|America/Chicago
Fort Worth, TX, USA|32.7555|-97.3308|America/Chicago
Houston, TX, USA|29.7604|-95.3698|America/Chicago
San Antonio, TX, USA|29.4241|-98.4936|America/Chicago
Austin, TX, USA|30.2672|-97.7431|America/Chicago
Oklahoma City, OK, USA|35.4676|-97.5164|America/Chicago
Tulsa, OK, USA|36.1540|-95.9928|America/Chicago
Kansas City, MO, USA|39.0997|-94.5786|America/Chicago
St. Louis, MO, USA|38.6270|-90.1994|America/Chicago
Omaha, NE, USA|41.2565|-95.9345|America/Chicago
Minneapolis, MN, USA|44.9778|-93.2650|America/Chicago
Chicago, IL, USA|41.8781|-87.6298|America/Chicago
Milwaukee, WI, USA|43.0389|-87.9065|America/Chicago
New Orleans, LA, USA|29.9511|-90.0715|America/Chicago
Memphis, TN, USA|35.1495|-90.0490|America/Chicago
Nashville, TN, USA|36.1627|-86.7816|America/Chicago
Birmingham, AL, USA|33.5186|-86.8104|America/Chicago
Indianapolis, IN, USA|39.7684|-86.1581|America/Indiana/Indianapolis
Detroit, MI, USA|42.3314|-83.0458|America/Detroit
Columbus, OH, USA|39.9612|-82.9988|America/New_York
Cleveland, OH, USA|41.4993|-81.6944|America/New_York
Cincinnati, OH, USA|39.1031|-84.5120|America/New_York
Louisville, KY, USA|38.2527|-85.7585|America/Kentucky/Louisville
Atlanta, GA, USA|33.7490|-84.3880|America/New_York
Miami, FL, USA|25.7617|-80.1918|America/New_York
Orlando, FL, USA|28.5383|-81.3792|America/New_York
Tampa, FL, USA|27.9506|-82.4572|America/New_York
Jacksonville, FL, USA|30.3322|-81.6557|America/New_York
Charlotte, NC, USA|35.2271|-80.8431|America/New_York
Raleigh, NC, USA|35.7796|-78.6382|America/New_York
Charleston, SC, USA|32.7765|-79.9311|America/New_York
Richmond, VA, USA|37.5407|-77.4360|America/New_York
Washington, DC, USA|38.9072|-77.0369|America/New_York
Baltimore, MD, USA|39.2904|-76.6122|America/New_York
Philadelphia, PA, USA|39.9526|-75.1652|America/New_York
Pittsburgh, PA, USA|40.4406|-79.9959|America/New_York
New York, NY, USA|40.7128|-74.0060|America/New_York
Brooklyn, NY, USA|40.6782|-73.9442|America/New_York
Buffalo, NY, USA|42.8864|-78.8784|America/New_York
Newark, NJ, USA|40.7357|-74.1724|America/New_York
Boston, MA, USA|42.3601|-71.0589|America/New_York
Hartford, CT, USA|41.7658|-72.6734|America/New_York
Providence, RI, USA|41.8240|-71.4128|America/New_York
Anchorage, AK, USA|61.2181|-149.9003|America/Anchorage
Honolulu, HI, USA|21.3069|-157.8583|Pacific/Honolulu
San Juan, Puerto Rico|18.4655|-66.1057|America/Puerto_Rico
Tijuana, Mexico|32.5149|-117.0382|America/Tijuana
Mexicali, Mexico|32.6245|-115.4523|America/Tijuana
Mexico City, Mexico|19.4326|-99.1332|America/Mexico_City
Guadalajara, Mexico|20.6597|-103.3496|America/Mexico_City
Monterrey, Mexico|25.6866|-100.3161|America/Monterrey
Hermosillo, Mexico|29.0729|-110.9559|America/Hermosillo
Toronto, Canada|43.6532|-79.3832|America/Toronto
Montreal, Canada|45.5017|-73.5673|America/Toronto
Vancouver, Canada|49.2827|-123.1207|America/Vancouver
Calgary, Canada|51.0447|-114.0719|America/Edmonton
Ottawa, Canada|45.4215|-75.6972|America/Toronto
Havana, Cuba|23.1136|-82.3666|America/Havana
Guatemala City, Guatemala|14.6349|-90.5069|America/Guatemala
San Salvador, El Salvador|13.6929|-89.2182|America/El_Salvador
Bogotá, Colombia|4.7110|-74.0721|America/Bogota
Lima, Peru|-12.0464|-77.0428|America/Lima
Santiago, Chile|-33.4489|-70.6693|America/Santiago
Buenos Aires, Argentina|-34.6037|-58.3816|America/Argentina/Buenos_Aires
São Paulo, Brazil|-23.5505|-46.6333|America/Sao_Paulo
Rio de Janeiro, Brazil|-22.9068|-43.1729|America/Sao_Paulo
Caracas, Venezuela|10.4806|-66.9036|America/Caracas
London, UK|51.5074|-0.1278|Europe/London
Manchester, UK|53.4808|-2.2426|Europe/London
Edinburgh, UK|55.9533|-3.1883|Europe/London
Dublin, Ireland|53.3498|-6.2603|Europe/Dublin
Paris, France|48.8566|2.3522|Europe/Paris
Madrid, Spain|40.4168|-3.7038|Europe/Madrid
Barcelona, Spain|41.3874|2.1686|Europe/Madrid
Lisbon, Portugal|38.7223|-9.1393|Europe/Lisbon
Rome, Italy|41.9028|12.4964|Europe/Rome
Milan, Italy|45.4642|9.1900|Europe/Rome
Berlin, Germany|52.5200|13.4050|Europe/Berlin
Munich, Germany|48.1351|11.5820|Europe/Berlin
Amsterdam, Netherlands|52.3676|4.9041|Europe/Amsterdam
Brussels, Belgium|50.8503|4.3517|Europe/Brussels
Zurich, Switzerland|47.3769|8.5417|Europe/Zurich
Vienna, Austria|48.2082|16.3738|Europe/Vienna
Prague, Czechia|50.0755|14.4378|Europe/Prague
Warsaw, Poland|52.2297|21.0122|Europe/Warsaw
Stockholm, Sweden|59.3293|18.0686|Europe/Stockholm
Oslo, Norway|59.9139|10.7522|Europe/Oslo
Copenhagen, Denmark|55.6761|12.5683|Europe/Copenhagen
Helsinki, Finland|60.1699|24.9384|Europe/Helsinki
Athens, Greece|37.9838|23.7275|Europe/Athens
Istanbul, Turkey|41.0082|28.9784|Europe/Istanbul
Kyiv, Ukraine|50.4501|30.5234|Europe/Kyiv
Moscow, Russia|55.7558|37.6173|Europe/Moscow
Cairo, Egypt|30.0444|31.2357|Africa/Cairo
Lagos, Nigeria|6.5244|3.3792|Africa/Lagos
Nairobi, Kenya|-1.2921|36.8219|Africa/Nairobi
Johannesburg, South Africa|-26.2041|28.0473|Africa/Johannesburg
Cape Town, South Africa|-33.9249|18.4241|Africa/Johannesburg
Casablanca, Morocco|33.5731|-7.5898|Africa/Casablanca
Accra, Ghana|5.6037|-0.1870|Africa/Accra
Addis Ababa, Ethiopia|8.9806|38.7578|Africa/Addis_Ababa
Dubai, UAE|25.2048|55.2708|Asia/Dubai
Riyadh, Saudi Arabia|24.7136|46.6753|Asia/Riyadh
Tehran, Iran|35.6892|51.3890|Asia/Tehran
Tel Aviv, Israel|32.0853|34.7818|Asia/Jerusalem
Karachi, Pakistan|24.8607|67.0011|Asia/Karachi
Mumbai, India|19.0760|72.8777|Asia/Kolkata
Delhi, India|28.7041|77.1025|Asia/Kolkata
Bangalore, India|12.9716|77.5946|Asia/Kolkata
Kolkata, India|22.5726|88.3639|Asia/Kolkata
Dhaka, Bangladesh|23.8103|90.4125|Asia/Dhaka
Bangkok, Thailand|13.7563|100.5018|Asia/Bangkok
Ho Chi Minh City, Vietnam|10.8231|106.6297|Asia/Ho_Chi_Minh
Hanoi, Vietnam|21.0278|105.8342|Asia/Bangkok
Singapore|1.3521|103.8198|Asia/Singapore
Kuala Lumpur, Malaysia|3.1390|101.6869|Asia/Kuala_Lumpur
Jakarta, Indonesia|-6.2088|106.8456|Asia/Jakarta
Manila, Philippines|14.5995|120.9842|Asia/Manila
Hong Kong|22.3193|114.1694|Asia/Hong_Kong
Shanghai, China|31.2304|121.4737|Asia/Shanghai
Beijing, China|39.9042|116.4074|Asia/Shanghai
Taipei, Taiwan|25.0330|121.5654|Asia/Taipei
Seoul, South Korea|37.5665|126.9780|Asia/Seoul
Tokyo, Japan|35.6762|139.6503|Asia/Tokyo
Osaka, Japan|34.6937|135.5023|Asia/Tokyo
Sydney, Australia|-33.8688|151.2093|Australia/Sydney
Melbourne, Australia|-37.8136|144.9631|Australia/Melbourne
Brisbane, Australia|-27.4698|153.0251|Australia/Brisbane
Perth, Australia|-31.9505|115.8605|Australia/Perth
Auckland, New Zealand|-36.8485|174.7633|Pacific/Auckland`.split("\n").map(l => { const [name, lat, lon, tz] = l.split("|"); return { name, lat: +lat, lon: +lon, tz }; });
if (typeof module !== "undefined") module.exports = CITIES;
