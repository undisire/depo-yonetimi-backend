const { Op } = require('sequelize');

class SearchBuilder {
  constructor(query) {
    this.query = query;
    this.where = {};
    this.include = [];
    this.order = [];
    this.limit = parseInt(query.limit) || 10;
    this.offset = (parseInt(query.page) - 1) * this.limit || 0;
  }

  // Temel filtreleme
  addFilter(field, value, operator = Op.eq) {
    if (value !== undefined && value !== '') {
      this.where[field] = { [operator]: value };
    }
    return this;
  }

  // Metin araması
  addSearch(fields, value) {
    if (value) {
      const searchConditions = fields.map(field => ({
        [field]: { [Op.like]: `%${value}%` }
      }));
      this.where[Op.or] = searchConditions;
    }
    return this;
  }

  // Tarih aralığı filtresi
  addDateRange(field, startDate, endDate) {
    if (startDate && endDate) {
      this.where[field] = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      this.where[field] = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      this.where[field] = {
        [Op.lte]: new Date(endDate)
      };
    }
    return this;
  }

  // Sayısal aralık filtresi
  addNumberRange(field, min, max) {
    if (min !== undefined && max !== undefined) {
      this.where[field] = {
        [Op.between]: [min, max]
      };
    } else if (min !== undefined) {
      this.where[field] = {
        [Op.gte]: min
      };
    } else if (max !== undefined) {
      this.where[field] = {
        [Op.lte]: max
      };
    }
    return this;
  }

  // İlişkili tablo filtresi
  addInclude(model, where = {}, required = false) {
    this.include.push({
      model,
      where,
      required
    });
    return this;
  }

  // Sıralama
  addOrder(field, direction = 'ASC') {
    if (field) {
      this.order.push([field, direction.toUpperCase()]);
    }
    return this;
  }

  // Sayfalama
  setPagination(page, limit) {
    if (page && limit) {
      this.limit = parseInt(limit);
      this.offset = (parseInt(page) - 1) * this.limit;
    }
    return this;
  }

  // Sorgu oluştur
  build() {
    return {
      where: this.where,
      include: this.include,
      order: this.order,
      limit: this.limit,
      offset: this.offset
    };
  }
}

module.exports = SearchBuilder;
