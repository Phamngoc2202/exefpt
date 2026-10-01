import haNoi from '../assets/destinations/ha-noi.jpg'
import haLong from '../assets/destinations/ha-long-commons.jpg'
import haLongSmall from '../assets/destinations/ha-long-commons-800.jpg'
import ninhBinh from '../assets/destinations/ninh-binh.jpg'
import saPa from '../assets/destinations/sa-pa-commons.jpg'
import saPaSmall from '../assets/destinations/sa-pa-commons-800.jpg'
import haGiang from '../assets/destinations/ha-giang-commons.jpg'
import haGiangSmall from '../assets/destinations/ha-giang-commons-800.jpg'

export const destinationImages = {
  'Hà Nội': haNoi,
  'Hạ Long': haLong,
  'Ninh Bình': ninhBinh,
  'Sa Pa': saPa,
  'Hà Giang': haGiang,
}

export const destinationImageSets = {
  'Sa Pa': { small: saPaSmall, large: saPa },
  'Hạ Long': { small: haLongSmall, large: haLong },
  'Hà Giang': { small: haGiangSmall, large: haGiang },
}

export const destinationImageCredits = {
  'Sa Pa': {
    label: 'Eerin25 · CC0',
    url: 'https://commons.wikimedia.org/wiki/File:Rice_terraces_in_Sapa,_Vietnam.jpg',
  },
  'Hạ Long': {
    label: 'Arianos · Public domain',
    url: 'https://commons.wikimedia.org/wiki/File:Halong_bay_Vietnam.JPG',
  },
  'Hà Giang': {
    label: 'Quangpraha · CC0',
    url: 'https://commons.wikimedia.org/wiki/File:Terraced_paddy_fields,_Ha_Giang,_Vietnam.jpg',
  },
}
