import mongoose from 'mongoose'
import { capitalize, empty } from '../lib/utils'

const Schema = mongoose.Schema

function reduce (data) {
  return data['BUTIKEROMBUD']['BUTIKOMBUD']
}

function transformOpeningHours (str) {
  const list = str ? str.split(/;;;0?\-?;/g) : []

  return list
    .filter(empty)
    .map(str => {
      let opening = str.replace('_*', '').split(';')
      const [day, openingHours, closingHours] = opening

      if ((parseInt(closingHours) - parseInt(openingHours)) <= 0) {
        return null
      }

      return `${day} ${openingHours}-${closingHours}`
    })
    .filter(empty)
}

function transformLabels (str) {
  const labels = str ? str.split(';') : []

  return labels
    .filter(empty)
    .map(capitalize)
}

function transformPhone (str) {
  return str.replace(/[\/\-]|\s/g, '')
}

const mapping = {
  NR: 'nr',
  NAMN: 'name',
  TYP: 'type',
  ADDRESS1: 'address',
  ADDRESS2: 'additional_address',
  ADDRESS3: 'zip_code',
  ADDRESS4: 'city',
  ADDRESS5: 'county',
  TELEFON: 'phone',
  BUTIKSTYP: 'shop_type',
  TJANSTER: 'services',
  SOKORD: 'labels',
  OPPETTIDER: 'opening_hours',
  RT90X: 'RT90x',
  RT90Y: 'RT90y'
}

const Store = new Schema({
  nr: { type: String, index: true, required: true },
  name: { type: String, index: true, default: null },
  type: { type: String, index: true, default: null },
  address: { type: String, index: true, default: null },
  additional_address: { type: String, index: true, default: null },
  zip_code: { type: String, index: true, default: null },
  city: { type: String, index: true, default: null, set: capitalize },
  county: { type: String, index: true, default: null },
  phone: { type: String, index: true, default: null, set: transformPhone },
  shop_type: { type: String, index: true, default: null },
  services: { type: String, index: true, default: null },
  labels: { type: Array, index: true, default: [], set: transformLabels },
  opening_hours: { type: Array, index: true, default: [], set: transformOpeningHours },
  RT90x: { type: Number, index: true, default: null },
  RT90y: { type: Number, index: true, default: null }
})

mongoose.model('Store', Store)

export { mapping, reduce }
