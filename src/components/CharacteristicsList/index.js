import React from "react";

import './index.css';

export default function CharacteristicsList() {

  return (
      <ul className="card__characteristics">
          <li className="card__rating">
              <strong>Рейтинг</strong>
          </li>
          <li className="card__price">
              <strong>Цена</strong>
          </li>
          <li className="card__color">
              <strong>Цвет</strong>
          </li>
          <li className="card__material">
              <strong>Материал</strong>
          </li>
          <li className="card__size">
              <strong>Размер</strong>
          </li>
          <li className="card__mechanism">
              <strong>Механизм</strong>
          </li>
          <li className="card__seller">
              <strong>Продавец</strong>
          </li>
      </ul>
  );
}
