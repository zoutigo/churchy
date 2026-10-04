'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { COUNTRIES, DEFAULT_COUNTRY, citiesOf, districtsOf, regionsOf } from '@churchy/shared';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';

/** Champs de localisation partagés par les formulaires de création et de modification. */
export interface LocationValues {
  country?: string;
  region?: string | null;
  city?: string;
  district?: string | null;
}

/** Valeur de la liste qui signale « ce n'est pas dans la liste : je le saisis moi-même ». */
const OTHER = '__other__';

/**
 * Pays → région → ville → quartier. Pour le Cameroun (par défaut), chaque niveau est une liste
 * déroulante filtrée par le niveau du dessus, avec la possibilité de saisir la ville ou le quartier
 * à la main s'il manque. Pour un autre pays, tout est en saisie libre.
 */
export function LocationFields() {
  const { watch, setValue } = useFormContext<LocationValues>();
  const country = watch('country') ?? '';
  const region = watch('region') ?? '';
  const city = watch('city') ?? '';
  const district = watch('district') ?? '';

  const structured = country === DEFAULT_COUNTRY;
  const regions = regionsOf(country);
  const cities = citiesOf(country, region);
  const districts = districtsOf(country, city);

  // Initialisés à partir des valeurs existantes : une ville ou un quartier absent des listes
  // (formulaire de modification) s'affiche directement en saisie manuelle.
  const [cityManual, setCityManual] = useState(structured && !!city && !cities.includes(city));
  const [districtManual, setDistrictManual] = useState(
    structured && !!district && !districts.includes(district),
  );

  const t = useTranslations('location');
  const tc = useTranslations('common');
  const set = (name: keyof LocationValues, value: string) =>
    setValue(name, value, { shouldDirty: true, shouldValidate: true });

  function resetBelow(level: 'country' | 'region' | 'city') {
    if (level === 'country') set('region', '');
    if (level !== 'city') {
      set('city', '');
      setCityManual(false);
    }
    set('district', '');
    setDistrictManual(false);
  }

  return (
    <div className="space-y-4">
      <FormField
        name="country"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('country')}</FormLabel>
            <FormControl>
              <NativeSelect
                {...field}
                value={field.value ?? ''}
                onChange={(e) => {
                  set('country', e.target.value);
                  resetBelow('country');
                }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </NativeSelect>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          name="region"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('region')}
                {!structured && (
                  <span className="text-muted-foreground text-xs"> {tc('optional')}</span>
                )}
              </FormLabel>
              <FormControl>
                {structured ? (
                  <NativeSelect
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      set('region', e.target.value);
                      resetBelow('region');
                    }}
                  >
                    <option value="">{t('chooseRegion')}</option>
                    {regions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </NativeSelect>
                ) : (
                  <Input
                    placeholder={t('regionPlaceholder')}
                    {...field}
                    value={field.value ?? ''}
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {structured ? (
          <FormField
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('city')}</FormLabel>
                <FormControl>
                  <NativeSelect
                    {...field}
                    disabled={!region}
                    value={cityManual ? OTHER : (field.value ?? '')}
                    onChange={(e) => {
                      const v = e.target.value;
                      resetBelow('city');
                      setCityManual(v === OTHER);
                      set('city', v === OTHER ? '' : v);
                    }}
                  >
                    <option value="">{region ? t('chooseCity') : t('chooseRegionFirst')}</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    {region && <option value={OTHER}>{t('otherCity')}</option>}
                  </NativeSelect>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('city')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('city')} {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {structured && cityManual && (
        <FormField
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('cityName')}</FormLabel>
              <FormControl>
                <Input placeholder={t('cityMissing')} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {structured && districts.length > 0 ? (
        <>
          <FormField
            name="district"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('district')}{' '}
                  <span className="text-muted-foreground text-xs">{tc('optional')}</span>
                </FormLabel>
                <FormControl>
                  <NativeSelect
                    {...field}
                    value={districtManual ? OTHER : (field.value ?? '')}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDistrictManual(v === OTHER);
                      set('district', v === OTHER ? '' : v);
                    }}
                  >
                    <option value="">{t('chooseDistrict')}</option>
                    {districts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                    <option value={OTHER}>{t('otherDistrict')}</option>
                  </NativeSelect>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {districtManual && (
            <FormField
              name="district"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('districtName')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('districtMissing')}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </>
      ) : (
        <FormField
          name="district"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('district')}{' '}
                <span className="text-muted-foreground text-xs">{tc('optional')}</span>
              </FormLabel>
              <FormControl>
                <Input placeholder={t('districtName')} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
