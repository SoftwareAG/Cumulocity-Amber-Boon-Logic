package com.softwareag.amber.service;

import com.cumulocity.model.option.OptionPK;
import com.cumulocity.rest.representation.tenant.OptionRepresentation;
import com.cumulocity.sdk.client.SDKException;
import com.cumulocity.sdk.client.option.TenantOptionApi;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.softwareag.amber.model.ServiceConfiguration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
public class CredentialsConfigurationService {
    private static final String OPTION_CATEGORY_CONFIGURATION = "amber.configuration";

    private static final String OPTION_KEY_CONFIGURATION = "credentials.amber.configuration";

    private final TenantOptionApi tenantOptionApi;

    @Autowired
    public CredentialsConfigurationService(final TenantOptionApi tenantOptionApi) {
        this.tenantOptionApi = tenantOptionApi;
    }

    public void saveConfiguration(final ServiceConfiguration configuration) throws JsonProcessingException {
        if (configuration == null) {
            return;
        }

        final String configurationJson = new ObjectMapper().writeValueAsString(configuration);
        final OptionRepresentation optionRepresentation = new OptionRepresentation();
        optionRepresentation.setCategory(OPTION_CATEGORY_CONFIGURATION);
        optionRepresentation.setKey(OPTION_KEY_CONFIGURATION);
        optionRepresentation.setValue(configurationJson);

        tenantOptionApi.save(optionRepresentation);
    }

    public Optional<ServiceConfiguration> loadConfiguration() {
        final OptionPK option = new OptionPK();
        option.setCategory(OPTION_CATEGORY_CONFIGURATION);
        option.setKey(OPTION_KEY_CONFIGURATION);
        try {
            final OptionRepresentation optionRepresentation = tenantOptionApi.getOption(option);
            final ServiceConfiguration configuration = new ObjectMapper().readValue(optionRepresentation.getValue(), ServiceConfiguration.class);
            return Optional.of(configuration);
        } catch (SDKException exception) {
            exception.printStackTrace();
        } catch (JsonMappingException e) {
            e.printStackTrace();
        } catch (JsonProcessingException e) {
            e.printStackTrace();
        }

        return Optional.empty();
    }

    public void deleteConfiguration() {
        final OptionPK optionPK = new OptionPK();
        optionPK.setKey(OPTION_KEY_CONFIGURATION);
        optionPK.setCategory(OPTION_CATEGORY_CONFIGURATION);

        tenantOptionApi.delete(optionPK);
    }
}
