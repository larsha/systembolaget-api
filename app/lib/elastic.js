import elasticsearch from 'elasticsearch'
import config from '../config'

const client = new elasticsearch.Client({ host: config.ELASTIC_HOST, log: config.ELASTIC_LOG, requestTimeout: 60000 })

class Elastic {
  static async newAlias () {
    return client.indices.getAlias({ index: '*', name: Elastic.index })
      .then(alias => {
        const newIndex = new Date().getTime()
        const oldIndex = Object.keys(alias).toString()

        return { newIndex, oldIndex }
      })
      .catch(e => {
        throw e
      })
  }

  static async deleteAlias (index) {
    return client.indices.deleteAlias({ name: Elastic.index, index })
      .catch(() => Promise.resolve())
  }

  static async putAlias (index) {
    return client.indices.putAlias({ name: Elastic.index, index })
      .catch(e => {
        throw e
      })
  }

  static async createIndex (index) {
    const options = {
      index,
      body: {
        mappings: {},
        settings: {
          index: {
            number_of_replicas: 0,
            analysis: {
              filter: {
                swedish_stop: {
                  type: 'stop',
                  stopwords: '_swedish_'
                },
                swedish_stemmer: {
                  type: 'stemmer',
                  language: 'swedish'
                },
                swedish_sort: {
                  type: 'icu_collation',
                  language: 'sv',
                  country: 'SE',
                  variant: '@collation=phonebook'
                }
              },
              analyzer: {
                swedish_sort: {
                  tokenizer: 'keyword',
                  filter: ['swedish_sort']
                },
                standard_text: {
                  tokenizer: 'standard',
                  filter: 'lowercase'
                },
                swedish_edgegram: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: [
                    'lowercase',
                    'swedish_stop',
                    'swedish_stemmer'
                  ]
                }
              }
            }
          }
        }
      }
    }

    return client.indices.create(options)
  }

  static async deleteIndex (index) {
    return client.indices.delete({ index }).catch(() => Promise.resolve())
  }

  static async getById (id) {
    return client.get({
      index: Elastic.index,
      type: this.type,
      id
    }).then(result => {
      return result._source
    })
    .catch(e => {
      throw e
    })
  }

  static async find (query, offset, limit, sort) {
    let filter = {
      index: Elastic.index,
      type: this.type,
      body: {
        from: offset,
        size: limit,
        sort
      }
    }

    if (Object.keys(query).length) {
      Object.assign(filter.body, { query })
    }

    return client.search(filter)
      .then(data => {
        const result = data.hits.hits.map(obj => {
          return obj._source
        })

        return { result, count: data.hits.total }
      })
      .catch(e => {
        throw e
      })
  }

  static async putMapping (index) {
    const mapping = {
      type: this.type,
      body: this.mapping,
      index
    }

    return client.indices.putMapping(mapping)
  }

  static async bulk (data, index) {
    let batch = []

    data.forEach(obj => {
      batch.push({
        index: {
          _index: index,
          _type: this.type,
          _id: obj.body.nr
        }
      })

      batch.push(obj.body)
    })

    return client.bulk({ body: batch })
  }

  static get type () {
    return this.name.toLowerCase()
  }

  static get index () {
    return config.ELASTIC_INDEX
  }

  static get mapping () {
    throw new Error('Mapping not implemented!')
  }

  static get model () {
    throw new Error('Model not implemented!')
  }

  constructor (data) {
    let mapped = {}
    this.body = {}
    this.id = null
    this.type = this.constructor.type
    this.model = this.constructor.model
    this.mapping = this.constructor.mapping.properties

    for (let prop in data) {
      if (data.hasOwnProperty(prop)) {
        if (this.model.hasOwnProperty(prop)) {
          const obj = this.model[prop]
          try {
            mapped[obj.value] = obj.transform(data[prop])
          } catch (e) {
            mapped[obj.value] = data[prop]
          }
        }
      }
    }

    for (let key in this.mapping) {
      if (this.mapping.hasOwnProperty(key)) {
        this.body[key] = mapped[key]
      }
    }
  }
}

export default Elastic
