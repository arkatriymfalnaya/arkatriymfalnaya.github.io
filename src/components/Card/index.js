import React from "react";

import Rating from '@material-ui/lab/Rating';
import CharacteristicsList from '../CharacteristicsList';

import './index.css';

export default function Card(props){
      let card;
      const isHeading = props.heading;

      if (isHeading) {
         card = (
             <article className="card card_heading">
                <CharacteristicsList />
             </article>
         );
       } else {
         card = (
             <article key={ props.good.key } className="card" tabIndex="1">
                 <figure className="card__picture">
                         <img
                            src={ props.good.picture }
                            alt={ `На изображении ${ props.good.name.toLowerCase()}` }
                        />
                 </figure>
                 <a className="card__title" href="/" title={ `Открыть товар ${ props.good.name }` }>
                     <strong>{ props.good.name }</strong>
                 </a>
                 <ul className="card__characteristics">
                     <li className="card__rating">
                         <Rating
                           name="read-only"
                           value={ + props.good.rate }
                           readOnly
                         />
                         <b>{ props.good.rate }</b>
                     </li>
                     { props.good.newPrice ? (
                         <li className="card__price">
                             <strong className="card__price_new">{ props.good.newPrice }</strong>
                             <span className="card__price_old">{ props.good.price }</span>
                         </li>
                     ) : (
                         <li className="card__price">
                             <span className="card__price">{ props.good.price }</span>
                         </li>
                     )}
                     <li className="card__color">
                         { props.good.color }
                     </li>
                     <li className="card__material">
                         { props.good.material }
                     </li>
                     <li className="card__size">
                         { props.good.size }
                     </li>
                     <li className="card__mechanism">
                         { props.good.mechanism }
                     </li>
                     <li className="card__seller">
                         <a
                             href={ props.good.sellerLink }
                             title={ `Перейти на сайт ${ props.good.seller }` }
                             target="_blank"
                             rel="noopener noreferrer">
                                 { props.good.seller }
                         </a>
                     </li>
                 </ul>
                 { props.good.likesBlocked ? (
                     <section className="card__functionality">
                         <button className="button button_buy" data-expanded="true">Купить</button>
                     </section>
                 ) : (
                     <section className="card__functionality">
                         <button className="button button_like"></button>
                         <button className="button button_buy">Купить</button>
                     </section>
                 )}
             </article>
         );
       }

    return (
        card
    );
}
