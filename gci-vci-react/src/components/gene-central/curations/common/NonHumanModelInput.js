import React from 'react';
import Select from 'react-select';

const nonHumanModelOrganisms = [
  "Anole (Anolis carolinensis) 28377",
  "Aspergillus (Aspergillus nidulans) 162425",
  "Budding yeast (Saccharomyces cerevisiae) 4932",
  "Cat (Felis catus) 9685",
  "Chicken (Gallus gallus) 9031",
  "Chimpanzee (Pan troglodytes) 9598",
  "Chlamydomonas (Chlamydomonas reinhardtii) 3055",
  "Cow (Bos taurus) 9913",
  "Dog (Canis lupus familiaris) 9615",
  "Ferret (Mustela putorius furo) 9669",
  "Fission yeast (Schizosaccharomyces pombe) 4896",
  "Frog (Xenopus) 262014",
  "Fruit fly (Drosophila) 7215",
  "Gerbil (Gerbillinae) 10045",
  "Guinea pig (Cavia porcellus) 10141",
  "Hamster (Cricetinae) 10026",
  "Horse (Equus caballus) 9796",
  "Hydra (Hydra vulgaris) 6087",
  "Macaque (Macaca) 9539",
  "Marmoset (Callithrix jacchus) 9483",
  "Medaka (Oryzias latipes) 8090",
  "Mouse (Mus musculus) 10090",
  "Neurospora (Neurospora crassa) 5141",
  "Paramecium (Paramecium tetraurelia) 5888",
  "Pig (Sus scrofa) 9823",
  "Planarian (Schmidtea mediterranea) 79327",
  "Rabbit (Oryctolagus cuniculus) 9986",
  "Rat (Rattus norvegicus) 10116",
  "Round worm (Caenorhabditis elegans) 6239",
  "Sheep (Ovis aries) 9940",
  "Slime mold (Dictyostelium discoideum) 44689",
  "Tetrahymena (Tetrahymena pyriformis) 5908",
  "Tetrahymena (Tetrahymena thermophila) 5911",
  "Trypanosome (Trypanosoma brucei) 5691",
  "Killifish, Atlantic (Fundulus heteroclitus) 8078",
  "Killifish, Turquoise (Nothobranchius furzeri) 105023",
  "Zebra finch (Taeniopygia guttata) 59729",
  "Zebrafish (Danio rerio) 7955"
];

const NonHumanModelInput = (props) => {
  // "type" is Rescue or Model Systems (res/ms); used to save value in formData ((ms/res)NonHumanModel)
  const options = nonHumanModelOrganisms.map(organism => {
    return {
      value: organism,
      label: organism,
      type: props.type
    }
  });

  const customStyles = {
    container: () => ({
      border: 'solid 1px red',
      borderRadius: '5px'
    })
  }

  const savedValue = options.filter(option => {
    if (option && option.value === props.value) {
      return option;
    }
  });
  
  return (
    <div className="row mb-4">
      <label className="col-sm-5 control-label">Non-human model organism: *</label>
      <div className="col-sm-7">
        <Select 
          defaultValue={savedValue || 'none'}
          error={props.error}
          onChange={props.handleChange}
          options={options}
          styles={props.error ? customStyles : {}}
        />
        {props.error ? <span style={{color: 'red', fontSize: '12px'}}>Required</span> : ''}
      </div>
    </div>
  );
}

export default NonHumanModelInput;
